package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.QuestionMarkCreateRequest;
import com.devdroid.spars_server.dto.QuestionMarkDTO;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.AssessmentType;
import com.devdroid.spars_server.entity.Mark;
import com.devdroid.spars_server.entity.QuestionMark;
import com.devdroid.spars_server.exception.DuplicateResourceException;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.MarkRepository;
import com.devdroid.spars_server.repository.QuestionMarkRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminQuestionMarkService {

    private final QuestionMarkRepository questionMarkRepository;
    private final MarkRepository markRepository;

    @Transactional
    public QuestionMarkDTO createQuestionMark(Long markId, QuestionMarkCreateRequest request) {
        // Validate mark exists and assessment is ASSIGNMENT or MIDSEM
        Mark mark = markRepository.findById(markId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found with id: " + markId));

        Assessment assessment = mark.getAssessment();
        if (!AssessmentType.ASSIGNMENT.equals(assessment.getType()) && !AssessmentType.MIDSEM.equals(assessment.getType())) {
            throw new IllegalArgumentException(
                    "Question marks can only be created for ASSIGNMENT or MIDSEM assessments. " +
                    "This assessment is of type: " + assessment.getType());
        }

        // Check for duplicate (same mark-question_number pair)
        if (questionMarkRepository.existsByMarkIdAndQuestionNumber(markId, request.getQuestionNumber())) {
            throw new DuplicateResourceException(
                    "Question mark already exists for mark " + markId +
                    " and question number " + request.getQuestionNumber());
        }

        // Validate obtained_marks doesn't exceed max_marks
        if (request.getObtainedMarks() > request.getMaxMarks()) {
            throw new IllegalArgumentException(
                    "obtainedMarks (" + request.getObtainedMarks() +
                    ") cannot exceed maxMarks (" + request.getMaxMarks() + ")");
        }

        QuestionMark questionMark = QuestionMark.builder()
                .mark(mark)
                .questionNumber(request.getQuestionNumber())
                .coNumber(request.getCoNumber())
                .maxMarks(request.getMaxMarks())
                .obtainedMarks(request.getObtainedMarks())
                .build();

        return toQuestionMarkDto(questionMarkRepository.save(questionMark));
    }

    @Transactional(readOnly = true)
    public QuestionMarkDTO getQuestionMarkById(Long questionMarkId) {
        QuestionMark questionMark = questionMarkRepository.findById(questionMarkId)
                .orElseThrow(() -> new ResourceNotFoundException("QuestionMark not found with id: " + questionMarkId));
        return toQuestionMarkDto(questionMark);
    }

    @Transactional(readOnly = true)
    public List<QuestionMarkDTO> getQuestionMarksByMark(Long markId) {
        // Validate mark exists
        markRepository.findById(markId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found with id: " + markId));

        return questionMarkRepository.findByMarkId(markId).stream()
                .map(this::toQuestionMarkDto)
                .toList();
    }

    private QuestionMarkDTO toQuestionMarkDto(QuestionMark questionMark) {
        return QuestionMarkDTO.builder()
                .id(questionMark.getId())
                .markId(questionMark.getMark().getId())
                .questionNumber(questionMark.getQuestionNumber())
                .coNumber(questionMark.getCoNumber())
                .maxMarks(questionMark.getMaxMarks())
                .obtainedMarks(questionMark.getObtainedMarks())
                .build();
    }
}
