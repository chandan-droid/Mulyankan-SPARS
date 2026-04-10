package com.devdroid.spars_server.controller.teacher;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.QuestionMarkCreateRequest;
import com.devdroid.spars_server.dto.QuestionMarkDTO;
import com.devdroid.spars_server.dto.QuestionMarkUpdateRequest;
import com.devdroid.spars_server.service.teacher.TeacherQuestionMarkService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/question-marks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherQuestionMarkController {

    private final TeacherQuestionMarkService questionMarkService;

    @PostMapping("/mark/{markId}")
    public ResponseEntity<ApiResponse<QuestionMarkDTO>> createQuestionMarkForMark(
            @PathVariable Long markId,
            @Valid @RequestBody QuestionMarkCreateRequest request) {
        QuestionMarkDTO questionMark = questionMarkService.createQuestionMarkForMark(markId, request);
        return ResponseEntity.ok(ApiResponse.<QuestionMarkDTO>builder()
                .success(true)
                .message("Question mark created successfully")
                .data(questionMark)
                .build());
    }

    @PutMapping("/{questionMarkId}")
    public ResponseEntity<ApiResponse<QuestionMarkDTO>> updateQuestionMark(
            @PathVariable Long questionMarkId,
            @Valid @RequestBody QuestionMarkUpdateRequest request) {
        QuestionMarkDTO questionMark = questionMarkService.updateQuestionMark(questionMarkId, request);
        return ResponseEntity.ok(ApiResponse.<QuestionMarkDTO>builder()
                .success(true)
                .message("Question mark updated successfully")
                .data(questionMark)
                .build());
    }

    @GetMapping("/mark/{markId}")
    public ResponseEntity<ApiResponse<List<QuestionMarkDTO>>> getQuestionMarksByMark(@PathVariable Long markId) {
        List<QuestionMarkDTO> questionMarks = questionMarkService.getQuestionMarksByMark(markId);
        return ResponseEntity.ok(ApiResponse.<List<QuestionMarkDTO>>builder()
                .success(true)
                .message("Question marks fetched successfully")
                .data(questionMarks)
                .build());
    }

    @GetMapping("/{questionMarkId}")
    public ResponseEntity<ApiResponse<QuestionMarkDTO>> getQuestionMarkDetail(@PathVariable Long questionMarkId) {
        QuestionMarkDTO questionMark = questionMarkService.getQuestionMarkDetail(questionMarkId);
        return ResponseEntity.ok(ApiResponse.<QuestionMarkDTO>builder()
                .success(true)
                .message("Question mark details fetched successfully")
                .data(questionMark)
                .build());
    }
}
