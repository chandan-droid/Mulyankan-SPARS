package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.BulkMarkCreateRequest;
import com.devdroid.spars_server.dto.MarkCreateRequest;
import com.devdroid.spars_server.dto.MarkDTO;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.Mark;
import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.exception.DuplicateResourceException;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AssessmentRepository;
import com.devdroid.spars_server.repository.MarkRepository;
import com.devdroid.spars_server.repository.StudentRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminMarkService {

    private final MarkRepository markRepository;
    private final StudentRepository studentRepository;
    private final AssessmentRepository assessmentRepository;

    @Transactional
    public MarkDTO createMark(MarkCreateRequest request) {
        // Validate student exists
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found with id: " + request.getStudentId()));

        // Validate assessment exists
        Assessment assessment = assessmentRepository.findById(request.getAssessmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assessment not found with id: " + request.getAssessmentId()));

        // Check for duplicate (same student-assessment pair)
        if (markRepository.existsByStudentIdAndAssessmentId(request.getStudentId(), request.getAssessmentId())) {
            throw new DuplicateResourceException(
                    "Mark already exists for student " + request.getStudentId() +
                    " and assessment " + request.getAssessmentId());
        }

        // Validate totalMarks doesn't exceed assessment maxMarks
        if (request.getTotalMarks() > assessment.getMaxMarks()) {
            throw new IllegalArgumentException(
                    "totalMarks (" + request.getTotalMarks() + ") cannot exceed assessment maxMarks (" + assessment.getMaxMarks() + ")");
        }

        Mark mark = Mark.builder()
                .student(student)
                .assessment(assessment)
                .totalMarks(request.getTotalMarks())
                .build();

        return toMarkDto(markRepository.save(mark));
    }

    @Transactional
    public List<MarkDTO> createMarksBulk(BulkMarkCreateRequest request) {
        List<MarkDTO> createdMarks = new ArrayList<>();

        for (MarkCreateRequest markRequest : request.getMarks()) {
            try {
                MarkDTO createdMark = createMark(markRequest);
                createdMarks.add(createdMark);
            } catch (DuplicateResourceException | IllegalArgumentException ex) {
                // Log and continue with next mark
                System.err.println("Skipped mark for student " + markRequest.getStudentId() +
                        ", assessment " + markRequest.getAssessmentId() + ": " + ex.getMessage());
            }
        }

        return createdMarks;
    }

    @Transactional(readOnly = true)
    public MarkDTO getMarkById(Long markId) {
        Mark mark = markRepository.findById(markId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found with id: " + markId));
        return toMarkDto(mark);
    }

    @Transactional(readOnly = true)
    public List<MarkDTO> getMarksByAssessment(Long assessmentId) {
        // Validate assessment exists
        assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + assessmentId));

        return markRepository.findByAssessmentId(assessmentId).stream()
                .map(this::toMarkDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MarkDTO> getMarksByStudent(Long studentId) {
        // Validate student exists
        studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));

        return markRepository.findByStudentId(studentId).stream()
                .map(this::toMarkDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MarkDTO> getMarksByClass(Long classId) {
        return markRepository.findAll().stream()
                .filter(mark -> mark.getAssessment().getAcademicClass().getId().equals(classId))
                .map(this::toMarkDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MarkDTO> getMarksByAssessmentAndClass(Long assessmentId, Long classId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + assessmentId));

        if (!assessment.getAcademicClass().getId().equals(classId)) {
            throw new IllegalArgumentException("Assessment does not belong to the specified class");
        }

        return markRepository.findByAssessmentId(assessmentId).stream()
                .map(this::toMarkDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MarkDTO> getMarksByStudentAndClass(Long studentId, Long classId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));

        if (!student.getAcademicClass().getId().equals(classId)) {
            throw new IllegalArgumentException("Student does not belong to the specified class");
        }

        return markRepository.findByStudentId(studentId).stream()
                .map(this::toMarkDto)
                .toList();
    }

    private MarkDTO toMarkDto(Mark mark) {
        return MarkDTO.builder()
                .id(mark.getId())
                .studentId(mark.getStudent().getId())
                .assessmentId(mark.getAssessment().getId())
                .totalMarks(mark.getTotalMarks())
                .createdAt(mark.getCreatedAt())
                .build();
    }
}
