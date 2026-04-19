package com.devdroid.spars_server.service.teacher;

import com.devdroid.spars_server.dto.AssignmentDTO;
import com.devdroid.spars_server.dto.AcademicClassDTO;
import com.devdroid.spars_server.entity.TeacherAssignment;
import com.devdroid.spars_server.entity.Teacher;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.TeacherAssignmentRepository;
import com.devdroid.spars_server.repository.TeacherRepository;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherClassService {

    private final TeacherRepository teacherRepository;
    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final AcademicClassRepository academicClassRepository;

    @Transactional(readOnly = true)
    public List<AssignmentDTO> getMyAssignments(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + teacherId));

        return teacherAssignmentRepository.findAll().stream()
                .filter(assignment -> assignment.getTeacher().getUserId().equals(teacherId))
                .map(this::toAssignmentDto)
                .toList();
    }

    private AssignmentDTO toAssignmentDto(TeacherAssignment assignment) {
        return AssignmentDTO.builder()
                .id(assignment.getId())
                .teacherId(assignment.getTeacher().getUserId())
                .subjectId(assignment.getSubject().getId())
                .classId(assignment.getAcademicClass().getId())
                .build();
    }

    @Transactional(readOnly = true)
    public AcademicClassDTO getClassById(Long classId) {
        return academicClassRepository.findById(classId).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));
    }

    private AcademicClassDTO toDto(com.devdroid.spars_server.entity.AcademicClass academicClass) {
        int studentCount = academicClass.getStudents() != null ? academicClass.getStudents().size() : 0;

        return AcademicClassDTO.builder()
                .id(academicClass.getId())
                .branch(academicClass.getBranch())
                .semester(academicClass.getSemester())
                .section(academicClass.getSection())
                .academicYear(academicClass.getAcademicYear())
                .studentCount(studentCount)
                .build();
    }

}
