package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.AssessmentCreateRequest;
import com.devdroid.spars_server.dto.AssessmentDTO;
import com.devdroid.spars_server.entity.AcademicClass;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.AssessmentRepository;
import com.devdroid.spars_server.repository.SubjectRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicClassRepository academicClassRepository;

    public AssessmentDTO createAssessment(AssessmentCreateRequest dto) {
        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + dto.getSubjectId()));

        AcademicClass academicClass = getClassOrThrow(dto.getClassId());

        if (dto.getMaxMarks() == null || dto.getMaxMarks() <= 0) {
            throw new IllegalArgumentException("maxMarks must be greater than 0");
        }

        Assessment assessment = Assessment.builder()
                .name(dto.getName().trim())
                .type(dto.getType())
                .subject(subject)
                .academicClass(academicClass)
                .maxMarks(dto.getMaxMarks())
                .examDate(dto.getExamDate())
                .build();

        return toAssessmentDto(assessmentRepository.save(assessment));
    }

    @Transactional(readOnly = true)
    public List<AssessmentDTO> getAssessments(Long subjectId, Long classId) {
        List<Assessment> assessments;

        if (subjectId != null && classId != null) {
            assessments = assessmentRepository.findByAcademicClassIdAndSubjectId(classId, subjectId);
        } else if (subjectId != null) {
            assessments = assessmentRepository.findBySubjectId(subjectId);
        } else if (classId != null) {
            assessments = assessmentRepository.findByAcademicClassId(classId);
        } else {
            assessments = assessmentRepository.findAll();
        }

        return assessments.stream().map(this::toAssessmentDto).toList();
    }

    private AcademicClass getClassOrThrow(Long classId) {
        return academicClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));
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
