package com.devdroid.spars_server.repository;

import com.devdroid.spars_server.entity.TeacherAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherAssignmentRepository extends JpaRepository<TeacherAssignment, Long> {

    boolean existsByTeacherUserIdAndSubjectIdAndAcademicClassId(Long teacherId, Long subjectId, Long classId);
}
