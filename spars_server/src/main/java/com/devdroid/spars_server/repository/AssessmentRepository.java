package com.devdroid.spars_server.repository;

import com.devdroid.spars_server.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    List<Assessment> findBySubjectId(Long subjectId);

    List<Assessment> findByAcademicClassIdAndSubjectId(Long classId, Long subjectId);

    List<Assessment> findByAcademicClassId(Long classId);
}
