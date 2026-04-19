package com.devdroid.spars_server.entity;

import com.devdroid.spars_server.entity.Student;
import com.devdroid.spars_server.entity.Subject;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "classes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String branch;

    @Column(nullable = false)
    private Integer semester;

    @Column
    private String section;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @OneToMany(mappedBy = "academicClass", fetch = FetchType.EAGER)
    private List<Student> students;

    @OneToMany(mappedBy = "academicClass", fetch = FetchType.EAGER)
    private List<Subject> subjects;
}
