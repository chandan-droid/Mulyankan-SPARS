package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.BulkStudentCreateRequest;
import com.devdroid.spars_server.dto.StudentDTO;
import com.devdroid.spars_server.service.admin.StudentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/students")
@RequiredArgsConstructor
public class AdminStudentController {

    private final StudentService studentService;

    @PostMapping
    public ResponseEntity<ApiResponse<StudentDTO>> createStudent(@Valid @RequestBody StudentDTO request) {
        StudentDTO student = studentService.createStudent(request);
        return ResponseEntity.ok(ApiResponse.<StudentDTO>builder()
                .success(true)
                .message("Student created successfully")
                .data(student)
                .build());
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<StudentDTO>>> createStudentsBulk(@Valid @RequestBody BulkStudentCreateRequest request) {
        List<StudentDTO> students = studentService.createStudentsBulk(request);
        return ResponseEntity.ok(ApiResponse.<List<StudentDTO>>builder()
                .success(true)
                .message("Students created successfully. Total: " + students.size())
                .data(students)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDTO>>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long classId
    ) {
        List<StudentDTO> students = studentService.getStudents(search, classId);
        return ResponseEntity.ok(ApiResponse.<List<StudentDTO>>builder()
                .success(true)
                .message("Students fetched successfully")
                .data(students)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDTO>> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody StudentDTO request
    ) {
        StudentDTO updated = studentService.updateStudent(id, request);
        return ResponseEntity.ok(ApiResponse.<StudentDTO>builder()
                .success(true)
                .message("Student updated successfully")
                .data(updated)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Student deleted successfully")
                .build());
    }
}
