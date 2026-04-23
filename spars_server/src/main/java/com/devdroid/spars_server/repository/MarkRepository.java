package com.devdroid.spars_server.repository;

import com.devdroid.spars_server.entity.Mark;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MarkRepository extends JpaRepository<Mark, Long> {

    Optional<Mark> findByStudentIdAndAssessmentId(Long studentId, Long assessmentId);

    List<Mark> findByAssessmentId(Long assessmentId);

    List<Mark> findByStudentId(Long studentId);

    boolean existsByStudentIdAndAssessmentId(Long studentId, Long assessmentId);

    @Query("SELECT m FROM Mark m JOIN m.assessment a WHERE a.subject.id = :subjectId")
    List<Mark> findBySubjectId(@Param("subjectId") Long subjectId);

    List<Mark> findByStudent_AcademicClassId(Long classId);

    @Query("SELECT m FROM Mark m WHERE m.assessment.id = :assessmentId AND m.student.academicClass.id = :classId")
    List<Mark> findByAssessmentIdAndStudentAcademicClassId(@Param("assessmentId") Long assessmentId, @Param("classId") Long classId);

    @Query("SELECT DISTINCT m.assessment.id FROM Mark m WHERE m.assessment.id IN :assessmentIds")
    List<Long> findDistinctAssessmentIdsWithRecordedMarks(@Param("assessmentIds") List<Long> assessmentIds);
}
