package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.SubjectDTO;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.repository.SubjectRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;

    public SubjectDTO createSubject(SubjectDTO dto) {
        Subject subject = Subject.builder()
                .subjectCode(dto.getSubjectCode().trim())
                .name(dto.getSubjectName().trim())
                .build();

        return toSubjectDto(subjectRepository.save(subject));
    }

    @Transactional(readOnly = true)
    public List<SubjectDTO> getAllSubjects() {
        return subjectRepository.findAll().stream().map(this::toSubjectDto).toList();
    }

    private SubjectDTO toSubjectDto(Subject subject) {
        return SubjectDTO.builder()
                .id(subject.getId())
                .subjectCode(subject.getSubjectCode())
                .subjectName(subject.getName())
                .build();
    }
}
