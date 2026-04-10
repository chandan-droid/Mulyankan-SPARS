package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.TeacherCreateDTO;
import com.devdroid.spars_server.dto.TeacherDTO;
import com.devdroid.spars_server.entity.Role;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.entity.Teacher;
import com.devdroid.spars_server.entity.User;
import com.devdroid.spars_server.exception.DuplicateResourceException;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.TeacherRepository;
import com.devdroid.spars_server.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherAdminService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public TeacherCreateDTO createTeacher(TeacherCreateDTO dto) {
        userRepository.findByEmail(dto.getEmail().trim())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Email already registered: " + dto.getEmail());
                });

        User user = User.builder()
                .name(dto.getName().trim())
                .email(dto.getEmail().trim())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(Role.TEACHER)
                .build();

        User savedUser = userRepository.save(user);

        Teacher teacher = Teacher.builder()
                .user(savedUser)
                .department(dto.getDepartment().trim())
                .build();

        teacherRepository.save(teacher);

        return TeacherCreateDTO.builder()
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .department(teacher.getDepartment())
                .password(null)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeacherDTO> getAllTeachers() {
        return teacherRepository.findAll().stream()
                .map(this::toTeacherDto)
                .collect(Collectors.toList());
    }

    private TeacherDTO toTeacherDto(Teacher teacher) {
        return TeacherDTO.builder()
                .id(teacher.getUserId())
                .name(teacher.getUser().getName())
                .email(teacher.getUser().getEmail())
                .department(teacher.getDepartment())
                .subjects(teacher.getSubjects().stream()
                        .map(Subject::getName)
                        .collect(Collectors.toList()))
                .build();
    }

    @Transactional
    public TeacherDTO updateTeacher(Long teacherId, TeacherDTO teacherDTO) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + teacherId));

        User user = teacher.getUser();
        user.setName(teacherDTO.getName());
        user.setEmail(teacherDTO.getEmail());
        userRepository.save(user);

        teacher.setDepartment(teacherDTO.getDepartment());
        Teacher updatedTeacher = teacherRepository.save(teacher);

        return toTeacherDto(updatedTeacher);
    }

    @Transactional
    public void deleteTeacher(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + teacherId));

        // Dissociate subjects from the teacher
        teacher.getSubjects().clear();
        teacherRepository.save(teacher);

        teacherRepository.delete(teacher);
        userRepository.delete(teacher.getUser());
    }
}
