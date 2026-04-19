package com.devdroid.spars_server.service.admin;

import com.devdroid.spars_server.dto.AcademicClassDTO;
import com.devdroid.spars_server.entity.AcademicClass;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminClassService {

    private final AcademicClassRepository academicClassRepository;

    @Transactional
    public AcademicClassDTO createClass(AcademicClassDTO dto) {
        AcademicClass academicClass = AcademicClass.builder()
                .branch(dto.getBranch())
                .semester(dto.getSemester())
                .section(dto.getSection())
                .academicYear(dto.getAcademicYear())
                .build();
        return toDto(academicClassRepository.save(academicClass));
    }

    @Transactional(readOnly = true)
    public List<AcademicClassDTO> getAllClasses() {
        return academicClassRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public AcademicClassDTO getClassById(Long id) {
        return academicClassRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + id));
    }

    @Transactional
    public AcademicClassDTO updateClass(Long id, AcademicClassDTO dto) {
        AcademicClass academicClass = academicClassRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + id));

        academicClass.setBranch(dto.getBranch());
        academicClass.setSemester(dto.getSemester());
        academicClass.setSection(dto.getSection());
        academicClass.setAcademicYear(dto.getAcademicYear());

        return toDto(academicClassRepository.save(academicClass));
    }

    @Transactional
    public void deleteClass(Long id) {
        if (!academicClassRepository.existsById(id)) {
            throw new ResourceNotFoundException("Class not found with id: " + id);
        }
        academicClassRepository.deleteById(id);
    }

    private AcademicClassDTO toDto(AcademicClass academicClass) {
        int studentCount = academicClass.getStudents() != null ? academicClass.getStudents().size() : 0;
        List<String> subjectNames = academicClass.getSubjects().stream()
                .map(Subject::getName)
                .toList();

        return AcademicClassDTO.builder()
                .id(academicClass.getId())
                .branch(academicClass.getBranch())
                .semester(academicClass.getSemester())
                .section(academicClass.getSection())
                .academicYear(academicClass.getAcademicYear())
                .studentCount(studentCount)
                .subjects(subjectNames)
                .build();
    }
}
