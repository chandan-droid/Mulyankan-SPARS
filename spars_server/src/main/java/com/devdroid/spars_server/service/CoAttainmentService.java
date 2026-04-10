package com.devdroid.spars_server.service;

import com.devdroid.spars_server.dto.CoAttainmentDTO;
import com.devdroid.spars_server.dto.CoAttainmentReportDTO;
import com.devdroid.spars_server.entity.AcademicClass;
import com.devdroid.spars_server.entity.QuestionMark;
import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.QuestionMarkRepository;
import com.devdroid.spars_server.repository.StudentRepository;
import com.devdroid.spars_server.repository.SubjectRepository;
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

    private static final double ATTAINMENT_THRESHOLD_PERCENTAGE = 0.6;

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getStudentCoAttainment(Long studentId, Long subjectId) {
        Student student = studentRepository.findById(studentId)
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
        AcademicClass academicClass = academicClassRepository.findById(classId)
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
        Map<Integer, List<QuestionMark>> marksByCo = questionMarks.stream()
                .collect(Collectors.groupingBy(QuestionMark::getCoNumber));

        return marksByCo.entrySet().stream()
                .map(entry -> {
                    Integer coNumber = entry.getKey();
                    List<QuestionMark> coMarks = entry.getValue();

                    double totalObtained = coMarks.stream().mapToDouble(QuestionMark::getObtainedMarks).sum();
                    double totalMax = coMarks.stream().mapToDouble(QuestionMark::getMaxMarks).sum();

                    double attainmentLevel = (totalMax > 0) ? (totalObtained / totalMax) : 0.0;

                    return new CoAttainmentDTO(coNumber, attainmentLevel);
                })
                .collect(Collectors.toList());
    }
}
