package com.devdroid.spars_server.repository;

import com.devdroid.spars_server.entity.QuestionMark;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionMarkRepository extends JpaRepository<QuestionMark, Long> {

    List<QuestionMark> findByMarkId(Long markId);

    Optional<QuestionMark> findByMarkIdAndQuestionNumber(Long markId, Integer questionNumber);

    boolean existsByMarkIdAndQuestionNumber(Long markId, Integer questionNumber);

    @Query("SELECT qm FROM QuestionMark qm JOIN qm.mark m WHERE m.student.id = :studentId AND m.assessment.subject.id = :subjectId")
    List<QuestionMark> findByStudentAndSubject(@Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

    @Query("SELECT qm FROM QuestionMark qm JOIN qm.mark m WHERE m.student.academicClass.id = :classId AND m.assessment.subject.id = :subjectId")
    List<QuestionMark> findByClassAndSubject(@Param("classId") Long classId, @Param("subjectId") Long subjectId);

    @Query("SELECT qm FROM QuestionMark qm JOIN qm.mark m WHERE m.assessment.subject.id = :subjectId")
    List<QuestionMark> findBySubject(@Param("subjectId") Long subjectId);

    @Query("SELECT qm FROM QuestionMark qm WHERE qm.mark.assessment.id = :assessmentId AND qm.mark.student.academicClass.id = :classId")
    List<QuestionMark> findByAssessmentAndClass(@Param("assessmentId") Long assessmentId, @Param("classId") Long classId);
}
