//package com.devdroid.spars_server.service.admin;
//
//import com.devdroid.spars_server.dto.AssignmentDTO;
//import com.devdroid.spars_server.entity.AcademicClass;
//import com.devdroid.spars_server.entity.Subject;
//import com.devdroid.spars_server.entity.Teacher;
//import com.devdroid.spars_server.entity.TeacherAssignment;
//import com.devdroid.spars_server.exception.DuplicateResourceException;
//import com.devdroid.spars_server.exception.ResourceNotFoundException;
//import com.devdroid.spars_server.repository.AcademicClassRepository;
//import com.devdroid.spars_server.repository.SubjectRepository;
//import com.devdroid.spars_server.repository.TeacherAssignmentRepository;
//import com.devdroid.spars_server.repository.TeacherRepository;
//import lombok.RequiredArgsConstructor;
//import org.springframework.dao.DataIntegrityViolationException;
//import org.springframework.stereotype.Service;
//
//@Service
//@RequiredArgsConstructor
//public class AssignmentService {
//
//    private final TeacherRepository teacherRepository;
//    private final SubjectRepository subjectRepository;
//    private final TeacherAssignmentRepository teacherAssignmentRepository;
//    private final AcademicClassRepository academicClassRepository;
//
//    public AssignmentDTO createTeacherAssignment(AssignmentDTO dto) {
//        Teacher teacher = teacherRepository.findById(dto.getTeacherId())
//                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + dto.getTeacherId()));
//
//        Subject subject = subjectRepository.findById(dto.getSubjectId())
//                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + dto.getSubjectId()));
//
//        AcademicClass academicClass = getClassOrThrow(dto.getClassId());
//
//        if (teacherAssignmentRepository.existsByTeacherUserIdAndSubjectIdAndAcademicClassId(
//                dto.getTeacherId(), dto.getSubjectId(), dto.getClassId())) {
//            throw new DuplicateResourceException("Teacher assignment already exists for this teacher, subject, and class");
//        }
//
//        TeacherAssignment assignment = TeacherAssignment.builder()
//                .teacher(teacher)
//                .subject(subject)
//                .academicClass(academicClass)
//                .build();
//
//        try {
//            TeacherAssignment saved = teacherAssignmentRepository.save(assignment);
//            return toAssignmentDto(saved);
//        } catch (DataIntegrityViolationException ex) {
//            throw new DuplicateResourceException("Duplicate teacher assignment is not allowed");
//        }
//    }
//
//    private AcademicClass getClassOrThrow(Long classId) {
//        return academicClassRepository.findById(classId)
//                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + classId));
//    }
//
//    private AssignmentDTO toAssignmentDto(TeacherAssignment assignment) {
//        return AssignmentDTO.builder()
//                .id(assignment.getId())
//                .teacherId(assignment.getTeacher().getUserId())
//                .subjectId(assignment.getSubject().getId())
//                .classId(assignment.getAcademicClass().getId())
//                .build();
//    }
//}
