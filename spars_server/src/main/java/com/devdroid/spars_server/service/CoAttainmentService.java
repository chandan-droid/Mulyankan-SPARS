package com.devdroid.spars_server.service;

import com.devdroid.spars_server.dto.CoAttainmentDTO;
import com.devdroid.spars_server.dto.CoAttainmentReportDTO;
import com.devdroid.spars_server.entity.QuestionMark;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.QuestionMarkRepository;
import com.devdroid.spars_server.repository.StudentRepository;
import com.devdroid.spars_server.repository.SubjectRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoAttainmentService {

    private final QuestionMarkRepository questionMarkRepository;
    private final StudentRepository studentRepository;
    private final AcademicClassRepository academicClassRepository;
    private final SubjectRepository subjectRepository;

    private static final double ATTAINMENT_THRESHOLD_PERCENTAGE = 0.60;
    private static final double DIRECT_WEIGHT = 0.80;
    private static final double INDIRECT_WEIGHT = 0.20;

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getStudentCoAttainment(Long studentId, Long subjectId) {
        studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));

        List<QuestionMark> questionMarks = questionMarkRepository.findByStudentAndSubject(studentId, subjectId);
        List<CoAttainmentDTO> coAttainments = calculateCoAttainment(questionMarks);

        return CoAttainmentReportDTO.builder()
                .subjectName(subject.getName())
                .scope("Student")
                .scopeId(studentId)
                .coAttainments(coAttainments)
                .build();
    }

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getClassCoAttainment(Long classId, Long subjectId) {
        academicClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass not found with id: " + classId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));

        List<QuestionMark> questionMarks = questionMarkRepository.findByClassAndSubject(classId, subjectId);
        List<CoAttainmentDTO> coAttainments = calculateCoAttainment(questionMarks);

        return CoAttainmentReportDTO.builder()
                .subjectName(subject.getName())
                .scope("Class")
                .scopeId(classId)
                .coAttainments(coAttainments)
                .build();
    }

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getInstituteCoAttainment(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));

        List<QuestionMark> questionMarks = questionMarkRepository.findBySubject(subjectId);
        List<CoAttainmentDTO> coAttainments = calculateCoAttainment(questionMarks);

        return CoAttainmentReportDTO.builder()
                .subjectName(subject.getName())
                .scope("Institute")
                .coAttainments(coAttainments)
                .build();
    }

    private List<CoAttainmentDTO> calculateCoAttainment(List<QuestionMark> questionMarks) {
        if (questionMarks == null || questionMarks.isEmpty()) {
            return List.of();
        }

        // Group by student first so we can evaluate threshold attainment per CO per student.
        Map<Long, List<QuestionMark>> marksByStudent = questionMarks.stream()
                .collect(Collectors.groupingBy(qm -> qm.getMark().getStudent().getId()));

        Map<Integer, Integer> studentsMeetingThresholdByCo = new LinkedHashMap<>();

        for (List<QuestionMark> studentMarks : marksByStudent.values()) {
            Map<Integer, List<QuestionMark>> marksByCoForStudent = studentMarks.stream()
                    .collect(Collectors.groupingBy(QuestionMark::getCoNumber));

            for (Map.Entry<Integer, List<QuestionMark>> coEntry : marksByCoForStudent.entrySet()) {
                Integer coNumber = coEntry.getKey();
                List<QuestionMark> coMarks = coEntry.getValue();

                double obtained = coMarks.stream().mapToDouble(QuestionMark::getObtainedMarks).sum();
                double max = coMarks.stream().mapToDouble(QuestionMark::getMaxMarks).sum();
                double studentCoAttainment = max > 0.0 ? obtained / max : 0.0;

                if (studentCoAttainment >= ATTAINMENT_THRESHOLD_PERCENTAGE) {
                    studentsMeetingThresholdByCo.merge(coNumber, 1, Integer::sum);
                } else {
                    studentsMeetingThresholdByCo.putIfAbsent(coNumber, 0);
                }
            }
        }

        int totalStudents = marksByStudent.size();
        if (totalStudents == 0) {
            return List.of();
        }

        List<CoAttainmentDTO> coAttainments = new ArrayList<>();
        for (Map.Entry<Integer, Integer> entry : studentsMeetingThresholdByCo.entrySet()) {
            Integer coNumber = entry.getKey();
            int studentsMeetingThreshold = entry.getValue();

            double directAttainmentPercent = (studentsMeetingThreshold * 100.0) / totalStudents;
            double indirectAttainmentPercent = resolveIndirectAttainmentPercent(coNumber, questionMarks);
            double finalCoAttainmentPercent = (directAttainmentPercent * DIRECT_WEIGHT)
                    + (indirectAttainmentPercent * INDIRECT_WEIGHT);

            coAttainments.add(new CoAttainmentDTO(coNumber, finalCoAttainmentPercent));
        }

        return coAttainments.stream()
                .sorted(Comparator.comparing(CoAttainmentDTO::getCoNumber))
                .collect(Collectors.toList());
    }

    // Placeholder hook for indirect attainment source. Falls back to direct-equivalent behavior until
    // feedback-based indirect data is integrated in the domain model.
    private double resolveIndirectAttainmentPercent(Integer coNumber, List<QuestionMark> questionMarks) {
        return calculateDirectAttainmentPercentForCo(coNumber, questionMarks);
    }

    private double calculateDirectAttainmentPercentForCo(Integer coNumber, List<QuestionMark> questionMarks) {
        Map<Long, List<QuestionMark>> marksByStudent = questionMarks.stream()
                .collect(Collectors.groupingBy(qm -> qm.getMark().getStudent().getId()));

        int studentsMeetingThreshold = 0;
        for (List<QuestionMark> studentMarks : marksByStudent.values()) {
            List<QuestionMark> coMarks = studentMarks.stream()
                    .filter(mark -> coNumber.equals(mark.getCoNumber()))
                    .toList();

            if (coMarks.isEmpty()) {
                continue;
            }

            double obtained = coMarks.stream().mapToDouble(QuestionMark::getObtainedMarks).sum();
            double max = coMarks.stream().mapToDouble(QuestionMark::getMaxMarks).sum();
            double studentCoAttainment = max > 0.0 ? obtained / max : 0.0;

            if (studentCoAttainment >= ATTAINMENT_THRESHOLD_PERCENTAGE) {
                studentsMeetingThreshold++;
            }
        }

        return marksByStudent.isEmpty() ? 0.0 : (studentsMeetingThreshold * 100.0) / marksByStudent.size();
    }
}
