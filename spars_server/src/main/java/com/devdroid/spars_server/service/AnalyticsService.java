package com.devdroid.spars_server.service;

import com.devdroid.spars_server.dto.CoAttainmentDTO;
import com.devdroid.spars_server.dto.analytics.*;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.Mark;
import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.repository.AssessmentRepository;
import com.devdroid.spars_server.repository.MarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MarkRepository markRepository;
    private final AssessmentRepository assessmentRepository;
    private final CoAttainmentService coAttainmentService;

    public List<PerformanceDistributionDTO> getPerformanceDistribution(Long assessmentId) {
        List<Mark> marks = markRepository.findByAssessmentId(assessmentId);
        if (marks.isEmpty()) {
            return List.of();
        }
        return calculatePerformanceDistribution(marks);
    }

    public List<PerformanceDistributionDTO> getPerformanceDistribution(Long classId, Long subjectId) {
        List<Mark> marks = filterMarks(classId, subjectId);
        if (marks.isEmpty()) {
            return List.of();
        }
        return calculatePerformanceDistribution(marks);
    }

    private List<PerformanceDistributionDTO> calculatePerformanceDistribution(List<Mark> marks) {
        Map<String, Long> distribution = marks.stream()
                .collect(Collectors.groupingBy(
                        mark -> {
                            double percentage = percentage(mark.getTotalMarks(), mark.getAssessment().getMaxMarks());
                            if (percentage < 10) return "0-10%";
                            if (percentage < 20) return "10-20%";
                            if (percentage < 30) return "20-30%";
                            if (percentage < 40) return "30-40%";
                            if (percentage < 50) return "40-50%";
                            if (percentage < 60) return "50-60%";
                            if (percentage < 70) return "60-70%";
                            if (percentage < 80) return "70-80%";
                            if (percentage < 90) return "80-90%";
                            return "90-100%";
                        },
                        Collectors.counting()
                ));

        List<PerformanceDistributionDTO> result = new ArrayList<>();
        for (int i = 0; i <= 90; i += 10) {
            String range = i + "-" + (i + 10) + "%";
            result.add(new PerformanceDistributionDTO(range, distribution.getOrDefault(range, 0L)));
        }
        return result;
    }

    public List<StudentPerformanceDTO> getTopPerformers(Long subjectId, int count) {
        return getStudentPerformances(null, subjectId).stream()
                .sorted(Comparator.comparingDouble(StudentPerformanceDTO::getOverallPercentage).reversed())
                .limit(count)
                .collect(Collectors.toList());
    }

    public List<StudentPerformanceDTO> getBottomPerformers(Long subjectId, int count) {
        return getStudentPerformances(null, subjectId).stream()
                .sorted(Comparator.comparingDouble(StudentPerformanceDTO::getOverallPercentage))
                .limit(count)
                .collect(Collectors.toList());
    }

    public List<StudentPerformanceDTO> getTopPerformers(Long classId, Long subjectId, int count) {
        return getStudentPerformances(classId, subjectId).stream()
                .sorted(Comparator.comparingDouble(StudentPerformanceDTO::getOverallPercentage).reversed())
                .limit(count)
                .collect(Collectors.toList());
    }

    public List<StudentPerformanceDTO> getBottomPerformers(Long classId, Long subjectId, int count) {
        return getStudentPerformances(classId, subjectId).stream()
                .sorted(Comparator.comparingDouble(StudentPerformanceDTO::getOverallPercentage))
                .limit(count)
                .collect(Collectors.toList());
    }

    private List<StudentPerformanceDTO> getStudentPerformances(Long classId, Long subjectId) {
        List<Mark> marks = filterMarks(classId, subjectId);
        Map<Student, List<Mark>> marksByStudent = marks.stream()
                .collect(Collectors.groupingBy(Mark::getStudent));

        return marksByStudent.entrySet().stream()
                .map(entry -> toStudentPerformance(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    private StudentPerformanceDTO toStudentPerformance(Student student, List<Mark> studentMarks) {
        double totalObtained = studentMarks.stream().mapToDouble(Mark::getTotalMarks).sum();
        double totalMax = studentMarks.stream().mapToDouble(m -> m.getAssessment().getMaxMarks()).sum();
        double overallPercentage = totalMax == 0.0 ? 0.0 : (totalObtained / totalMax) * 100.0;
        return new StudentPerformanceDTO(student.getId(), student.getName(), overallPercentage);
    }

    public List<CoAttainmentComparisonDTO> getCoAttainmentComparison(Long subjectId) {
        List<Assessment> assessments = assessmentRepository.findBySubjectId(subjectId);
        return assessments.stream()
                .map(assessment -> {
                    List<CoAttainmentDTO> coAttainments = coAttainmentService.getClassCoAttainment(assessment.getAcademicClass().getId(), subjectId).getCoAttainments();
                    return new CoAttainmentComparisonDTO(assessment.getId(), assessment.getName(), coAttainments);
                })
                .collect(Collectors.toList());
    }

    public OverallPerformanceDTO getOverallPerformance(Long classId, Long subjectId) {
        List<Mark> marks = filterMarks(classId, subjectId);
        if (marks.isEmpty()) {
            return new OverallPerformanceDTO(0.0, 0.0, 0.0);
        }
        double average = marks.stream().mapToDouble(m -> percentage(m.getTotalMarks(), m.getAssessment().getMaxMarks())).average().orElse(0.0);
        long passCount = marks.stream().filter(m -> percentage(m.getTotalMarks(), m.getAssessment().getMaxMarks()) >= 40.0).count();
        double passPercentage = percent(passCount, marks.size());
        return new OverallPerformanceDTO(average, passPercentage, 100.0 - passPercentage);
    }

    public List<DepartmentPerformanceDTO> getDepartmentPerformance(Long classId, Long subjectId) {
        Map<String, List<Mark>> grouped = filterMarks(classId, subjectId).stream()
                .collect(Collectors.groupingBy(m -> m.getStudent().getAcademicClass().getBranch(), LinkedHashMap::new, Collectors.toList()));

        if (grouped.isEmpty()) {
            return List.of();
        }

        return grouped.entrySet().stream()
                .map(entry -> {
                    DepartmentPerformanceDTO dto = new DepartmentPerformanceDTO();
                    dto.setDepartment(entry.getKey());
                    dto.setAverageMarks(averagePercentage(entry.getValue()));
                    dto.setPassPercentage(passPercentage(entry.getValue()));
                    return dto;
                })
                .sorted(Comparator.comparingDouble(DepartmentPerformanceDTO::getAverageMarks).reversed())
                .collect(Collectors.toList());
    }

    public List<SubjectAnalyticsDTO> getSubjectAnalytics(Long classId) {
        Map<Long, List<Mark>> grouped = filterMarks(classId, null).stream()
                .collect(Collectors.groupingBy(m -> m.getAssessment().getSubject().getId(), LinkedHashMap::new, Collectors.toList()));
        return grouped.entrySet().stream()
                .map(entry -> {
                    Assessment assessment = entry.getValue().get(0).getAssessment();
                    return new SubjectAnalyticsDTO(
                            assessment.getSubject().getId(),
                            assessment.getSubject().getName(),
                            averagePercentage(entry.getValue()),
                            passPercentage(entry.getValue()));
                })
                .sorted(Comparator.comparingDouble(SubjectAnalyticsDTO::getAverageMarks).reversed())
                .collect(Collectors.toList());
    }

    public List<ExamAnalyticsDTO> getExamAnalytics(Long classId, Long subjectId) {
        List<Mark> marks = filterMarks(classId, subjectId);
        Map<Long, List<Mark>> grouped = marks.stream().collect(Collectors.groupingBy(m -> m.getAssessment().getId(), LinkedHashMap::new, Collectors.toList()));
        List<ExamAnalyticsDTO> result = new ArrayList<>();
        Double previous = null;
        for (Map.Entry<Long, List<Mark>> entry : grouped.entrySet()) {
            Assessment assessment = entry.getValue().get(0).getAssessment();
            double avg = averagePercentage(entry.getValue());
            Double delta = previous == null ? null : avg - previous;
            result.add(new ExamAnalyticsDTO(assessment.getId(), assessment.getName(), assessment.getType().name(), avg, passPercentage(entry.getValue()), delta));
            previous = avg;
        }
        return result;
    }

    public List<StudentRiskBandDTO> getTopStudentsInstitutionWide(int count) {
        return studentAnalytics(filterMarks(null, null)).stream()
                .sorted(Comparator.comparingDouble(StudentRiskBandDTO::getOverallPercentage).reversed())
                .limit(count)
                .collect(Collectors.toList());
    }

    public List<StudentRiskBandDTO> getWeakStudentsInstitutionWide(double threshold) {
        return studentAnalytics(filterMarks(null, null)).stream()
                .filter(dto -> dto.getOverallPercentage() < threshold)
                .sorted(Comparator.comparingDouble(StudentRiskBandDTO::getOverallPercentage))
                .collect(Collectors.toList());
    }

    public List<TrendPointDTO> getPerformanceTrends(Long classId, Long subjectId) {
        Map<String, List<Mark>> grouped = filterMarks(classId, subjectId).stream()
                .collect(Collectors.groupingBy(m -> m.getAssessment().getAcademicClass().getAcademicYear() + "-S" + m.getAssessment().getAcademicClass().getSemester(), LinkedHashMap::new, Collectors.toList()));
        return grouped.entrySet().stream()
                .map(e -> new TrendPointDTO(e.getKey(), averagePercentage(e.getValue())))
                .collect(Collectors.toList());
    }

    public List<ComparativeAnalyticsDTO> getComparativeAnalytics(String compareType, String leftKey, String rightKey) {
        String metric = compareType == null ? "comparison" : compareType;
        return List.of(new ComparativeAnalyticsDTO(metric, leftKey, 0.0, rightKey, 0.0, 0.0));
    }

    public ReportFileDTO generateAdminReport(String reportType, String format) {
        String safeType = reportType == null ? "report" : reportType;
        String safeFormat = format == null ? "PDF" : format.toUpperCase();
        String fileName = safeType.replaceAll("\\s+", "_") + "." + safeFormat.toLowerCase();
        return new ReportFileDTO(safeType, safeFormat, fileName, "/api/admin/analytics/reports/download/" + fileName);
    }

    public List<PredictionDTO> predictLikelyFailures() {
        return studentAnalytics(filterMarks(null, null)).stream()
                .map(dto -> new PredictionDTO(dto.getStudentId(), dto.getStudentName(), Math.max(0.0, 100.0 - dto.getOverallPercentage()), dto.getOverallPercentage()))
                .sorted(Comparator.comparingDouble(PredictionDTO::getFailureRiskPercent).reversed())
                .collect(Collectors.toList());
    }

    public List<PerformanceIndexDTO> getPerformanceIndex() {
        return studentAnalytics(filterMarks(null, null)).stream()
                .map(dto -> new PerformanceIndexDTO(dto.getStudentId(), dto.getStudentName(), Math.round(dto.getOverallPercentage() * 0.7 * 100.0) / 100.0))
                .sorted(Comparator.comparingDouble(PerformanceIndexDTO::getPerformanceScore).reversed())
                .collect(Collectors.toList());
    }

    public List<GapAnalysisDTO> getGapAnalysis() {
        return studentAnalytics(filterMarks(null, null)).stream()
                .map(dto -> {
                    double expected = 75.0;
                    double actual = dto.getOverallPercentage();
                    return new GapAnalysisDTO(dto.getStudentId(), dto.getStudentName(), expected, actual, expected - actual);
                })
                .sorted(Comparator.comparingDouble(GapAnalysisDTO::getGap).reversed())
                .collect(Collectors.toList());
    }

    public List<ImprovementTrackingDTO> getImprovementTracking() {
        Map<Long, List<Mark>> byStudent = filterMarks(null, null).stream()
                .collect(Collectors.groupingBy(m -> m.getStudent().getId()));
        return byStudent.entrySet().stream()
                .map(entry -> {
                    Student student = entry.getValue().get(0).getStudent();
                    List<Mark> sorted = entry.getValue().stream().sorted(Comparator.comparing(m -> m.getAssessment().getExamDate())).collect(Collectors.toList());
                    double previous = sorted.size() > 1 ? percentage(sorted.get(0).getTotalMarks(), sorted.get(0).getAssessment().getMaxMarks()) : 0.0;
                    double current = sorted.isEmpty() ? 0.0 : percentage(sorted.get(sorted.size() - 1).getTotalMarks(), sorted.get(sorted.size() - 1).getAssessment().getMaxMarks());
                    return new ImprovementTrackingDTO(student.getId(), student.getName(), previous, current, current - previous);
                })
                .sorted(Comparator.comparingDouble(ImprovementTrackingDTO::getDelta).reversed())
                .collect(Collectors.toList());
    }

    public OverallPerformanceDTO getClassOverview(Long classId, Long subjectId) {
        List<Mark> marks = filterMarksForClass(classId, subjectId);
        if (marks.isEmpty()) {
            return new OverallPerformanceDTO(0.0, 0.0, 0.0);
        }
        double average = marks.stream().mapToDouble(m -> percentage(m.getTotalMarks(), m.getAssessment().getMaxMarks())).average().orElse(0.0);
        long passCount = marks.stream().filter(m -> percentage(m.getTotalMarks(), m.getAssessment().getMaxMarks()) >= 40.0).count();
        double passPercentage = percent(passCount, marks.size());
        return new OverallPerformanceDTO(average, passPercentage, 100.0 - passPercentage);
    }

    public List<StudentRiskBandDTO> getTeacherTopStudents(Long classId, Long subjectId, int count) {
        return studentAnalytics(filterMarksForClass(classId, subjectId)).stream()
                .sorted(Comparator.comparingDouble(StudentRiskBandDTO::getOverallPercentage).reversed())
                .limit(count)
                .collect(Collectors.toList());
    }

    public List<StudentRiskBandDTO> getTeacherWeakStudents(Long classId, Long subjectId, double threshold) {
        return studentAnalytics(filterMarksForClass(classId, subjectId)).stream()
                .filter(dto -> dto.getOverallPercentage() < threshold)
                .sorted(Comparator.comparingDouble(StudentRiskBandDTO::getOverallPercentage))
                .collect(Collectors.toList());
    }

    public List<TrendPointDTO> getTeacherPerformanceTrends(Long classId, Long subjectId) {
        Map<String, List<Mark>> grouped = filterMarksForClass(classId, subjectId).stream()
                .collect(Collectors.groupingBy(m -> m.getAssessment().getExamDate().toString(), LinkedHashMap::new, Collectors.toList()));
        return grouped.entrySet().stream()
                .map(e -> new TrendPointDTO(e.getKey(), averagePercentage(e.getValue())))
                .collect(Collectors.toList());
    }

    public ReportFileDTO generateTeacherReport(Long classId, Long subjectId, String reportType, String format) {
        String safeType = reportType == null ? "report" : reportType;
        String safeFormat = format == null ? "PDF" : format.toUpperCase();
        String fileName = "teacher_" + classId + "_" + (subjectId == null ? "all" : subjectId) + "_" + safeType.replaceAll("\\s+", "_") + "." + safeFormat.toLowerCase();
        return new ReportFileDTO(safeType, safeFormat, fileName, "/api/teacher/analytics/reports/download/" + fileName);
    }

    private List<Mark> filterMarksForClass(Long classId, Long subjectId) {
        return filterMarks(classId, subjectId);
    }

    private List<StudentRiskBandDTO> studentAnalytics(List<Mark> marks) {
        Map<Student, List<Mark>> marksByStudent = marks.stream().collect(Collectors.groupingBy(Mark::getStudent));
        return marksByStudent.entrySet().stream()
                .map(entry -> {
                    Student student = entry.getKey();
                    double avg = averagePercentage(entry.getValue());
                    String band = avg >= 80 ? "Excellent" : avg >= 60 ? "Average" : "At Risk";
                    return new StudentRiskBandDTO(student.getId(), student.getName(), avg, band);
                })
                .collect(Collectors.toList());
    }

    private List<Mark> filterMarks(Long classId, Long subjectId) {
        return markRepository.findAll().stream()
                .filter(mark -> classId == null || Objects.equals(mark.getStudent().getAcademicClass().getId(), classId))
                .filter(mark -> subjectId == null || Objects.equals(mark.getAssessment().getSubject().getId(), subjectId))
                .collect(Collectors.toList());
    }


    private double averagePercentage(List<Mark> marks) {
        return marks.stream().mapToDouble(m -> percentage(m.getTotalMarks(), m.getAssessment().getMaxMarks())).average().orElse(0.0);
    }

    private double passPercentage(List<Mark> marks) {
        long pass = marks.stream().filter(m -> percentage(m.getTotalMarks(), m.getAssessment().getMaxMarks()) >= 40.0).count();
        return percent(pass, marks.size());
    }

    private double percentage(Double obtained, Integer maxMarks) {
        if (obtained == null || maxMarks == null || maxMarks == 0) {
            return 0.0;
        }
        return (obtained / maxMarks) * 100.0;
    }

    private double percent(long value, long total) {
        return total == 0 ? 0.0 : (value * 100.0) / total;
    }
}
