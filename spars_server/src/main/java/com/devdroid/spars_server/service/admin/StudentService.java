package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.BulkStudentCreateRequest;
import com.devdroid.spars_server.dto.StudentDTO;
import com.devdroid.spars_server.entity.AcademicClass;
import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.exception.DuplicateResourceException;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.StudentRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final AcademicClassRepository academicClassRepository;

    public StudentDTO createStudent(StudentDTO dto) {
        if (studentRepository.existsByRegNo(dto.getRegNo())) {
            throw new DuplicateResourceException("Student with regNo already exists: " + dto.getRegNo());
        }

        AcademicClass academicClass = getClassOrThrow(dto.getClassId());

        Student student = Student.builder()
                .regNo(dto.getRegNo().trim())
                .name(dto.getName().trim())
                .academicClass(academicClass)
                .build();

        return toStudentDto(studentRepository.save(student));
    }

    @Transactional
    public List<StudentDTO> createStudentsBulk(BulkStudentCreateRequest request) {
        List<StudentDTO> createdStudents = new ArrayList<>();

        for (StudentDTO studentDto : request.getStudents()) {
            try {
                // Reuse single creation logic but catch exceptions to continue
                StudentDTO createdStudent = createStudent(studentDto);
                createdStudents.add(createdStudent);
            } catch (DuplicateResourceException ex) {
                // Log and skip duplicates
                System.err.println("Skipped duplicate student: " + ex.getMessage());
            }
        }

        return createdStudents;
    }

    @Transactional(readOnly = true)
    public List<StudentDTO> getStudents(String search, Long classId) {
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

    public StudentDTO updateStudent(Long id, StudentDTO dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));

        String updatedRegNo = dto.getRegNo().trim();
        if (studentRepository.existsByRegNoAndIdNot(updatedRegNo, id)) {
            throw new DuplicateResourceException("Student with regNo already exists: " + updatedRegNo);
        }

        AcademicClass academicClass = getClassOrThrow(dto.getClassId());

        student.setRegNo(updatedRegNo);
        student.setName(dto.getName().trim());
        student.setAcademicClass(academicClass);

        return toStudentDto(studentRepository.save(student));
    }

    public void deleteStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
        studentRepository.delete(student);
    }

    private AcademicClass getClassOrThrow(Long classId) {
        return academicClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));
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
