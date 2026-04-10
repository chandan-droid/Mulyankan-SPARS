package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.SubjectDTO;
import com.devdroid.spars_server.service.admin.SubjectService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/subjects")
@RequiredArgsConstructor
public class AdminSubjectController {

    private final SubjectService subjectService;

    @PostMapping
    public ResponseEntity<ApiResponse<SubjectDTO>> createSubject(@Valid @RequestBody SubjectDTO request) {
        SubjectDTO subject = subjectService.createSubject(request);
        return ResponseEntity.ok(ApiResponse.<SubjectDTO>builder()
                .success(true)
                .message("Subject created successfully")
                .data(subject)
                .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> getAllSubjects() {
        List<SubjectDTO> subjects = subjectService.getAllSubjects();
        return ResponseEntity.ok(ApiResponse.<List<SubjectDTO>>builder()
                .success(true)
                .message("Subjects fetched successfully")
                .data(subjects)
                .build());
    }
}
