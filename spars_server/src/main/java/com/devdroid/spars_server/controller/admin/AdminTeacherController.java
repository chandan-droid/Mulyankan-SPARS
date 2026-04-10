package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.TeacherCreateDTO;
import com.devdroid.spars_server.dto.TeacherDTO;
import com.devdroid.spars_server.service.admin.TeacherAdminService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/teachers")
@RequiredArgsConstructor
public class AdminTeacherController {

    private final TeacherAdminService teacherAdminService;

    @PostMapping
    public ResponseEntity<ApiResponse<TeacherCreateDTO>> createTeacher(@Valid @RequestBody TeacherCreateDTO request) {
        TeacherCreateDTO teacher = teacherAdminService.createTeacher(request);
        return ResponseEntity.ok(ApiResponse.<TeacherCreateDTO>builder()
                .success(true)
                .message("Teacher created successfully")
                .data(teacher)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeacherDTO>>> getAllTeachers() {
        List<TeacherDTO> teachers = teacherAdminService.getAllTeachers();
        return ResponseEntity.ok(ApiResponse.<List<TeacherDTO>>builder()
                .success(true)
                .message("Teachers fetched successfully")
                .data(teachers)
                .build());
    }

    @PutMapping("/{teacherId}")
    public ResponseEntity<ApiResponse<TeacherDTO>> updateTeacher(@PathVariable Long teacherId, @Valid @RequestBody TeacherDTO teacherDTO) {
        TeacherDTO updatedTeacher = teacherAdminService.updateTeacher(teacherId, teacherDTO);
        return ResponseEntity.ok(ApiResponse.<TeacherDTO>builder()
                .success(true)
                .message("Teacher updated successfully")
                .data(updatedTeacher)
                .build());
    }

    @DeleteMapping("/{teacherId}")
    public ResponseEntity<ApiResponse<Void>> deleteTeacher(@PathVariable Long teacherId) {
        teacherAdminService.deleteTeacher(teacherId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Teacher deleted successfully")
                .build());
    }
}
