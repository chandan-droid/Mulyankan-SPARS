package com.devdroid.spars_server.service.teacher;

import com.devdroid.spars_server.dto.QuestionMarkCreateRequest;
import com.devdroid.spars_server.dto.QuestionMarkDTO;
import com.devdroid.spars_server.dto.QuestionMarkUpdateRequest;
import com.devdroid.spars_server.dto.StudentQuestionMarksRequest;
import com.devdroid.spars_server.dto.TeacherQuestionMarkBulkUpsertRequest;
import com.devdroid.spars_server.entity.Assessment;
import com.devdroid.spars_server.entity.AssessmentType;
import com.devdroid.spars_server.entity.Mark;
import com.devdroid.spars_server.entity.QuestionMark;
import com.devdroid.spars_server.exception.DuplicateResourceException;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.MarkRepository;
import com.devdroid.spars_server.repository.QuestionMarkRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherQuestionMarkService {

    private final QuestionMarkRepository questionMarkRepository;
    private final MarkRepository markRepository;

    @Transactional
    public QuestionMarkDTO createQuestionMarkForMark(Long markId, QuestionMarkCreateRequest request) {
        // Validate mark exists and assessment is ASSIGNMENT or MIDSEM
        Mark mark = markRepository.findById(markId)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found with id: " + markId));

        Assessment assessment = mark.getAssessment();
        if (!AssessmentType.ASSIGNMENT.equals(assessment.getType()) && !AssessmentType.MIDSEM.equals(assessment.getType())) {
            throw new IllegalArgumentException(
                    "Question marks can only be created for ASSIGNMENT or MIDSEM assessments. " +
                    "This assessment is of type: " + assessment.getType());
        }

        // Check for duplicate
        if (questionMarkRepository.existsByMarkIdAndQuestionNumber(markId, request.getQuestionNumber())) {
            throw new DuplicateResourceException(
                    "Question mark already exists for mark " + markId +
                    " and question number " + request.getQuestionNumber());
        }

        // Validate marks
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

    @Transactional
    public QuestionMarkDTO updateQuestionMark(Long questionMarkId, QuestionMarkUpdateRequest request) {
        QuestionMark questionMark = questionMarkRepository.findById(questionMarkId)
                .orElseThrow(() -> new ResourceNotFoundException("QuestionMark not found with id: " + questionMarkId));

        // Validate marks
        if (request.getMarksObtained() > questionMark.getMaxMarks()) {
            throw new IllegalArgumentException(
                    "obtainedMarks (" + request.getMarksObtained() +
                    ") cannot exceed maxMarks (" + questionMark.getMaxMarks() + ")");
        }

        questionMark.setObtainedMarks(request.getMarksObtained());
        questionMark.setCoNumber(request.getCoNumber());
        return toQuestionMarkDto(questionMarkRepository.save(questionMark));
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

    @Transactional(readOnly = true)
    public QuestionMarkDTO getQuestionMarkDetail(Long questionMarkId) {
        QuestionMark questionMark = questionMarkRepository.findById(questionMarkId)
                .orElseThrow(() -> new ResourceNotFoundException("QuestionMark not found with id: " + questionMarkId));
        return toQuestionMarkDto(questionMark);
    }

    @Transactional(readOnly = true)
    public List<QuestionMarkDTO> getQuestionMarksByAssessmentAndClass(Long assessmentId, Long classId) {
        return questionMarkRepository.findByAssessmentAndClass(assessmentId, classId).stream()
                .map(this::toQuestionMarkDto)
                .toList();
    }

    @Transactional
    public List<QuestionMarkDTO> saveQuestionMarksByAssessmentAndClass(Long assessmentId, Long classId, TeacherQuestionMarkBulkUpsertRequest request) {
        List<Mark> marks = markRepository.findByAssessmentIdAndStudentAcademicClassId(assessmentId, classId);
        Map<Long, Mark> marksByStudentId = marks.stream()
                .collect(Collectors.toMap(mark -> mark.getStudent().getId(), Function.identity()));

        List<QuestionMark> allUpsertedQuestionMarks = new ArrayList<>();

        for (StudentQuestionMarksRequest studentMarksRequest : request.getStudentMarks()) {
            Long studentId = studentMarksRequest.getStudentId();
            Mark mark = marksByStudentId.get(studentId);

            if (mark == null) {
                // Or handle this case as an error, depending on requirements
                continue;
            }

            for (QuestionMarkCreateRequest qmRequest : studentMarksRequest.getQuestionMarks()) {
                Optional<QuestionMark> existingQm = questionMarkRepository.findByMarkIdAndQuestionNumber(mark.getId(), qmRequest.getQuestionNumber());

                QuestionMark questionMark = existingQm.orElse(new QuestionMark());
                questionMark.setMark(mark);
                questionMark.setQuestionNumber(qmRequest.getQuestionNumber());
                questionMark.setCoNumber(qmRequest.getCoNumber());
                questionMark.setMaxMarks(qmRequest.getMaxMarks());
                questionMark.setObtainedMarks(qmRequest.getObtainedMarks());

                allUpsertedQuestionMarks.add(questionMark);
            }
        }

        return questionMarkRepository.saveAll(allUpsertedQuestionMarks).stream()
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
