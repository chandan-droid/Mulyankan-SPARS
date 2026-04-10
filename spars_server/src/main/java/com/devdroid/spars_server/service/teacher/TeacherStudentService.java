package com.devdroid.spars_server.service.teacher;

import com.devdroid.spars_server.dto.StudentDTO;
import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.StudentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherStudentService {

    private final StudentRepository studentRepository;
    private final AcademicClassRepository academicClassRepository;

    @Transactional(readOnly = true)
    public List<StudentDTO> getStudentsByClass(Long classId) {
        // Verify class exists
        academicClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));

        return studentRepository.findByAcademicClassId(classId).stream()
                .map(this::toStudentDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentDTO getStudentById(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));
        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDTO> searchStudents(String search, Long classId) {
        String normalizedSearch = search == null ? "" : search.trim();

        List<Student> students;
        if (classId != null && !normalizedSearch.isBlank()) {
            students = studentRepository
                    .findByAcademicClassIdAndNameContainingIgnoreCaseOrAcademicClassIdAndRegNoContainingIgnoreCase(
                            classId,
                            normalizedSearch,
                            classId,
                            normalizedSearch
                    );
        } else if (classId != null) {
            students = studentRepository.findByAcademicClassId(classId);
        } else if (!normalizedSearch.isBlank()) {
            students = studentRepository.findByNameContainingIgnoreCaseOrRegNoContainingIgnoreCase(
                    normalizedSearch,
                    normalizedSearch
            );
        } else {
            students = studentRepository.findAll();
        }

        return students.stream().map(this::toStudentDto).toList();
    }

    private StudentDTO toStudentDto(Student student) {
        return StudentDTO.builder()
                .id(student.getId())
                .regNo(student.getRegNo())
                .name(student.getName())
                .classId(student.getAcademicClass().getId())
                .build();
    }
}
