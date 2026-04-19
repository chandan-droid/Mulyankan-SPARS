package com.devdroid.spars_server.service.teacher;

import com.devdroid.spars_server.dto.BulkMarkCreateRequest;
import com.devdroid.spars_server.dto.BulkMarkUpdateRequest;
import com.devdroid.spars_server.dto.MarkCreateRequest;
import com.devdroid.spars_server.dto.MarkDTO;
import com.devdroid.spars_server.dto.MarkUpdateRequest;
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
public class TeacherMarkService {

    private final MarkRepository markRepository;
    private final StudentRepository studentRepository;
    private final AssessmentRepository assessmentRepository;

    @Transactional
    public MarkDTO createMarkForAssessment(Long assessmentId, MarkCreateRequest request) {
        // Validate assessment exists
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + assessmentId));

        // Validate student exists and belongs to same class
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + request.getStudentId()));

        if (!student.getAcademicClass().getId().equals(assessment.getAcademicClass().getId())) {
            throw new IllegalArgumentException(
                    "Student " + request.getStudentId() + " does not belong to the assessment's class");
        }

        // Check for duplicate
        if (markRepository.existsByStudentIdAndAssessmentId(request.getStudentId(), assessmentId)) {
            throw new DuplicateResourceException(
                    "Mark already exists for student " + request.getStudentId() +
                    " and assessment " + assessmentId);
        }

        // Validate totalMarks
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
    public List<MarkDTO> updateMarksForAssessmentBulk(Long assessmentId, BulkMarkUpdateRequest request) {
        // Validate assessment exists first
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + assessmentId));

        List<MarkDTO> createdMarks = new ArrayList<>();

        for (MarkUpdateRequest markRequest : request.getMarks()) {
            try {
                // Validate student belongs to class
                Student student = studentRepository.findById(markRequest.getStudentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + markRequest.getStudentId()));

                if (!student.getAcademicClass().getId().equals(assessment.getAcademicClass().getId())) {
                    System.err.println("Skipped mark for student " + markRequest.getStudentId() +
                            ": Student does not belong to assessment's class");
                    continue;
                }

                // Check for duplicate
                if (markRepository.existsByStudentIdAndAssessmentId(markRequest.getStudentId(), assessmentId)) {
                    System.err.println("Skipped mark for student " + markRequest.getStudentId() +
                            ": Mark already exists for this assessment");
                    continue;
                }

                // Validate totalMarks
                if (markRequest.getMarksObtained() > assessment.getMaxMarks()) {
                    System.err.println("Skipped mark for student " + markRequest.getStudentId() +
                            ": totalMarks exceeds assessment maxMarks");
                    continue;
                }

                Mark mark = Mark.builder()
                        .student(student)
                        .assessment(assessment)
                        .totalMarks(markRequest.getMarksObtained())
                        .build();

                createdMarks.add(toMarkDto(markRepository.save(mark)));
            } catch (ResourceNotFoundException ex) {
                System.err.println("Skipped mark for student " + markRequest.getStudentId() + ": " + ex.getMessage());
            }
        }

        return createdMarks;
    }

    @Transactional
    public MarkDTO updateMark(Long markId, MarkUpdateRequest request) {
        Mark mark = markRepository.findById(markId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found with id: " + markId));

        // Validate totalMarks
        if (request.getMarksObtained() > mark.getAssessment().getMaxMarks()) {
            throw new IllegalArgumentException(
                    "totalMarks (" + request.getMarksObtained() + ") cannot exceed assessment maxMarks (" + mark.getAssessment().getMaxMarks() + ")");
        }

        mark.setTotalMarks(request.getMarksObtained());
        return toMarkDto(markRepository.save(mark));
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
    public MarkDTO getMarkByStudentAndAssessment(Long studentId, Long assessmentId) {
        Mark mark = markRepository.findByStudentIdAndAssessmentId(studentId, assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Mark not found for student " + studentId + " and assessment " + assessmentId));
        return toMarkDto(mark);
    }

    @Transactional(readOnly = true)
    public List<MarkDTO> getStudentMarksInClass(Long studentId, Long classId) {
        // Validate student exists and belongs to class
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));

        if (!student.getAcademicClass().getId().equals(classId)) {
            throw new IllegalArgumentException(
                    "Student " + studentId + " does not belong to class " + classId);
        }

        return markRepository.findByStudentId(studentId).stream()
                .filter(mark -> mark.getAssessment().getAcademicClass().getId().equals(classId))
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
    public List<MarkDTO> getMarksByStudent(Long studentId) {
        // Validate student exists
        studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));

        return markRepository.findByStudentId(studentId).stream()
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

    @Transactional
    public List<MarkDTO> updateMarksForAssessmentBulk(Long assessmentId, BulkMarkUpdateRequest request) {
        // Validate assessment exists first
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + assessmentId));

        List<MarkDTO> updatedMarks = new ArrayList<>();

        for (MarkUpdateRequest markRequest : request.getMarks()) {
            try {
                // Validate student belongs to class
                Student student = studentRepository.findById(markRequest.getStudentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + markRequest.getStudentId()));

                if (!student.getAcademicClass().getId().equals(assessment.getAcademicClass().getId())) {
                    System.err.println("Skipped mark for student " + markRequest.getStudentId() +
                            ": Student does not belong to assessment's class");
                    continue;
                }

                // Find existing mark
                Mark existingMark = markRepository.findByStudentIdAndAssessmentId(markRequest.getStudentId(), assessmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Mark not found for student " + markRequest.getStudentId() +
                                " and assessment " + assessmentId));

                // Validate totalMarks
                if (markRequest.getMarksObtained() > assessment.getMaxMarks()) {
                    System.err.println("Skipped mark for student " + markRequest.getStudentId() +
                            ": totalMarks exceeds assessment maxMarks");
                    continue;
                }

                existingMark.setTotalMarks(markRequest.getMarksObtained());
                updatedMarks.add(toMarkDto(markRepository.save(existingMark)));
            } catch (ResourceNotFoundException ex) {
                System.err.println("Skipped mark for student " + markRequest.getStudentId() + ": " + ex.getMessage());
            }
        }

        return updatedMarks;
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
