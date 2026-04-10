package com.devdroid.spars_server.controller.teacher;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.AssignmentDTO;
import com.devdroid.spars_server.security.CustomUserDetails;
import com.devdroid.spars_server.service.teacher.ClassroomService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/classrooms")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class ClassroomController {

    private final ClassroomService classroomService;

    @GetMapping("/my-assignments")
    public ResponseEntity<ApiResponse<List<AssignmentDTO>>> getMyAssignments(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        List<AssignmentDTO> assignments = classroomService.getMyAssignments(currentUser.getUser().getId());
        return ResponseEntity.ok(ApiResponse.<List<AssignmentDTO>>builder()
                .success(true)
                .message("Teacher assignments fetched successfully")
                .data(assignments)
                .build());
    }
}
