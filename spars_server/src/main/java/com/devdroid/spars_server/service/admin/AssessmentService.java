package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.AssessmentDTO;
import com.devdroid.spars_server.entity.AcademicClass;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.AssessmentType;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.entity.Teacher;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.AssessmentRepository;
import com.devdroid.spars_server.repository.SubjectRepository;
import com.devdroid.spars_server.repository.TeacherRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicClassRepository academicClassRepository;

    @Transactional
    public void createDefaultAssessments(Teacher teacher, Subject subject, AcademicClass academicClass) {
        createAssessment("MidSem Exam", AssessmentType.MIDSEM, 20, subject, academicClass);
        createAssessment("Quiz", AssessmentType.QUIZ, 5, subject, academicClass);
        createAssessment("Assignment", AssessmentType.ASSIGNMENT, 10, subject, academicClass);
        createAssessment("Attendance", AssessmentType.ATTENDANCE, 5, subject, academicClass);
    }

    private void createAssessment(String name, AssessmentType type, Integer maxMarks,  Subject subject, AcademicClass academicClass) {
        Assessment assessment = Assessment.builder()
                .name(name)
                .type(type)
                .maxMarks(maxMarks)
                .subject(subject)
                .academicClass(academicClass)
                .build();
        assessmentRepository.save(assessment);
    }

    @Transactional(readOnly = true)
    public List<AssessmentDTO> getAssessmentsByClassAndSubject(Long classId, Long subjectId) {
        return assessmentRepository.findByAcademicClassIdAndSubjectId(classId, subjectId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AssessmentDTO> getAllAssessments() {
        return assessmentRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AssessmentDTO updateAssessment(Long id, AssessmentDTO dto) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + id));

        assessment.setName(dto.getName());
        assessment.setMaxMarks(dto.getMaxMarks());
        assessment.setExamDate(dto.getExamDate());

        return toDto(assessmentRepository.save(assessment));
    }

    @Transactional
    public void deleteAssessment(Long id) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found with id: " + id));
        assessmentRepository.delete(assessment);
    }

    private AssessmentDTO toDto(Assessment assessment) {
        return AssessmentDTO.builder()
                .id(assessment.getId())
                .name(assessment.getName())
                .type(assessment.getType())
                .maxMarks(assessment.getMaxMarks())
                .examDate(assessment.getExamDate())
                .subjectId(assessment.getSubject().getId())
                .classId(assessment.getAcademicClass().getId())
                .build();
    }
}
