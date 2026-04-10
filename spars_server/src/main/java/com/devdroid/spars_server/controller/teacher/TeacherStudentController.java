package com.devdroid.spars_server.controller.teacher;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.StudentDTO;
import com.devdroid.spars_server.service.teacher.TeacherStudentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/students")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherStudentController {

    private final TeacherStudentService teacherStudentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long classId
    ) {
        List<StudentDTO> students = teacherStudentService.searchStudents(search, classId);
        return ResponseEntity.ok(ApiResponse.<List<StudentDTO>>builder()
                .success(true)
                .message("Students fetched successfully")
                .data(students)
                .build());
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getStudentsByClass(@PathVariable Long classId) {
        List<StudentDTO> students = teacherStudentService.getStudentsByClass(classId);
        return ResponseEntity.ok(ApiResponse.<List<StudentDTO>>builder()
                .success(true)
                .message("Students for class fetched successfully")
                .data(students)
                .build());
    }

    @GetMapping("/{studentId}")
    public ResponseEntity<ApiResponse<StudentDTO>> getStudentDetails(@PathVariable Long studentId) {
        StudentDTO student = teacherStudentService.getStudentById(studentId);
        return ResponseEntity.ok(ApiResponse.<StudentDTO>builder()
                .success(true)
                .message("Student details fetched successfully")
                .data(student)
                .build());
    }
}
