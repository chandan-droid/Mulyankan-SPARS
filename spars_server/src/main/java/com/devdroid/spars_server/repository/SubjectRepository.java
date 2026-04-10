package com.devdroid.spars_server.repository;

import com.devdroid.spars_server.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
}
