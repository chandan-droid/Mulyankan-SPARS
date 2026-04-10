package com.devdroid.spars_server.service;

import com.devdroid.spars_server.dto.CoAttainmentDTO;
import com.devdroid.spars_server.dto.analytics.CoAttainmentComparisonDTO;
import com.devdroid.spars_server.dto.analytics.PerformanceDistributionDTO;
import com.devdroid.spars_server.dto.analytics.StudentPerformanceDTO;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.Mark;
import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.repository.AssessmentRepository;
import com.devdroid.spars_server.repository.MarkRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

        Map<String, Long> distribution = marks.stream()
                .collect(Collectors.groupingBy(
                        mark -> {
                            double percentage = (mark.getTotalMarks() / mark.getAssessment().getMaxMarks()) * 100;
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
        return getStudentPerformances(subjectId).stream()
                .sorted(Comparator.comparingDouble(StudentPerformanceDTO::getOverallPercentage).reversed())
                .limit(count)
                .collect(Collectors.toList());
    }

    public List<StudentPerformanceDTO> getBottomPerformers(Long subjectId, int count) {
        return getStudentPerformances(subjectId).stream()
                .sorted(Comparator.comparingDouble(StudentPerformanceDTO::getOverallPercentage))
                .limit(count)
                .collect(Collectors.toList());
    }

    private List<StudentPerformanceDTO> getStudentPerformances(Long subjectId) {
        List<Mark> marks = markRepository.findBySubjectId(subjectId);
        Map<Student, List<Mark>> marksByStudent = marks.stream()
                .collect(Collectors.groupingBy(Mark::getStudent));

        return marksByStudent.entrySet().stream()
                .map(entry -> {
                    Student student = entry.getKey();
                    List<Mark> studentMarks = entry.getValue();
                    double totalObtained = studentMarks.stream().mapToDouble(Mark::getTotalMarks).sum();
                    double totalMax = studentMarks.stream().mapToDouble(m -> m.getAssessment().getMaxMarks()).sum();
                    double overallPercentage = (totalMax > 0) ? (totalObtained / totalMax) * 100 : 0.0;
                    return new StudentPerformanceDTO(student.getId(), student.getName(), overallPercentage);
                })
                .collect(Collectors.toList());
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
}
