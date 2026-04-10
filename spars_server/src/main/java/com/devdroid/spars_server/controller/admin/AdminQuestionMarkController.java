package com.devdroid.spars_server.controller.admin;

import com.devdroid.spars_server.dto.ApiResponse;
import com.devdroid.spars_server.dto.QuestionMarkDTO;
import com.devdroid.spars_server.service.admin.AdminQuestionMarkService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/question-marks")
@RequiredArgsConstructor
public class AdminQuestionMarkController {

    private final AdminQuestionMarkService questionMarkService;

    @GetMapping("/{questionMarkId}")
    public ResponseEntity<ApiResponse<QuestionMarkDTO>> getQuestionMarkById(@PathVariable Long questionMarkId) {
        QuestionMarkDTO questionMark = questionMarkService.getQuestionMarkById(questionMarkId);
        return ResponseEntity.ok(ApiResponse.<QuestionMarkDTO>builder()
                .success(true)
                .message("Question mark fetched successfully")
                .data(questionMark)
                .build());
    }

    @GetMapping("/by-mark/{markId}")
    public ResponseEntity<ApiResponse<List<QuestionMarkDTO>>> getQuestionMarksByMark(@PathVariable Long markId) {
        List<QuestionMarkDTO> questionMarks = questionMarkService.getQuestionMarksByMark(markId);
        return ResponseEntity.ok(ApiResponse.<List<QuestionMarkDTO>>builder()
                .success(true)
                .message("Question marks fetched successfully")
                .data(questionMarks)
                .build());
    }
}
