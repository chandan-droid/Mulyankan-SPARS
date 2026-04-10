package com.devdroid.spars_server.service.teacher;

import com.devdroid.spars_server.dto.AssessmentDTO;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AssessmentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherAssessmentService {

    private final AssessmentRepository assessmentRepository;

    @Transactional(readOnly = true)
    public List<AssessmentDTO> getMyAssessments(Long classId, Long subjectId) {
        List<Assessment> assessments;

        if (classId != null && subjectId != null) {
            assessments = assessmentRepository.findByAcademicClassIdAndSubjectId(subjectId, classId);
        } else if (classId != null) {
            assessments = assessmentRepository.findByAcademicClassId(classId);
        } else if (subjectId != null) {
            assessments = assessmentRepository.findBySubjectId(subjectId);
        } else {
            assessments = assessmentRepository.findAll();
        }

        return assessments.stream().map(this::toAssessmentDto).toList();
    }

    @Transactional(readOnly = true)
    public AssessmentDTO getAssessmentById(Long assessmentId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + assessmentId));
        return toAssessmentDto(assessment);
    }

    private AssessmentDTO toAssessmentDto(Assessment assessment) {
        return AssessmentDTO.builder()
                .id(assessment.getId())
                .name(assessment.getName())
                .type(assessment.getType())
                .subjectId(assessment.getSubject().getId())
                .classId(assessment.getAcademicClass().getId())
                .maxMarks(assessment.getMaxMarks())
                .examDate(assessment.getExamDate())
                .build();
    }
}
