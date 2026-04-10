package com.devdroid.spars_server.repository;

import com.devdroid.spars_server.entity.Student;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByRegNo(String regNo);

    boolean existsByRegNoAndIdNot(String regNo, Long id);

    List<Student> findByAcademicClassId(Long classId);

    List<Student> findByNameContainingIgnoreCaseOrRegNoContainingIgnoreCase(String name, String regNo);

    List<Student> findByAcademicClassIdAndNameContainingIgnoreCaseOrAcademicClassIdAndRegNoContainingIgnoreCase(
            Long classIdForName,
            String name,
            Long classIdForRegNo,
            String regNo
    );
}
