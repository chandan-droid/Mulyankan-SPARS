package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.TeacherAssignmentDTO;
import com.devdroid.spars_server.entity.AcademicClass;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.entity.Teacher;
import com.devdroid.spars_server.entity.TeacherAssignment;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.SubjectRepository;
import com.devdroid.spars_server.repository.TeacherAssignmentRepository;
import com.devdroid.spars_server.repository.TeacherRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherAssignmentService {

    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicClassRepository academicClassRepository;
    private final AssessmentService assessmentService;

    @Transactional
    public TeacherAssignmentDTO createAssignment(TeacherAssignmentDTO dto) {
        Teacher teacher = teacherRepository.findById(dto.getTeacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + dto.getTeacherId()));
        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + dto.getSubjectId()));
        AcademicClass academicClass = academicClassRepository.findById(dto.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + dto.getClassId()));

        TeacherAssignment assignment = TeacherAssignment.builder()
                .teacher(teacher)
                .subject(subject)
                .academicClass(academicClass)
                .build();

        TeacherAssignment savedAssignment = teacherAssignmentRepository.save(assignment);

        assessmentService.createDefaultAssessments(teacher, subject, academicClass);

        return toDto(savedAssignment);
    }

    @Transactional(readOnly = true)
    public List<TeacherAssignmentDTO> getAllAssignments() {
        return teacherAssignmentRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAssignment(Long id) {
        if (!teacherAssignmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Teacher assignment not found with id: " + id);
        }
        teacherAssignmentRepository.deleteById(id);
    }

    private TeacherAssignmentDTO toDto(TeacherAssignment assignment) {
        return TeacherAssignmentDTO.builder()
                .id(assignment.getId())
                .teacherId(assignment.getTeacher().getUserId())
                .subjectId(assignment.getSubject().getId())
                .classId(assignment.getAcademicClass().getId())
                .teacherName(assignment.getTeacher().getUser().getName())
                .subjectName(assignment.getSubject().getName())
                .className(assignment.getAcademicClass().getBranch() + " " + assignment.getAcademicClass().getSemester())
                .build();
    }
}
