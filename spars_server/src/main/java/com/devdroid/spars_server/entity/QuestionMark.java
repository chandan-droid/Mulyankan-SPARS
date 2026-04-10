package com.devdroid.spars_server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "question_marks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"marks_id", "question_number"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionMark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marks_id", nullable = false)
    private Mark mark;

    @Column(name = "question_number", nullable = false)
    private Integer questionNumber;

    @Column(name = "co_number", nullable = false)
    private Integer coNumber;

    @Column(name = "max_marks", nullable = false)
    private Double maxMarks;

    @Column(name = "obtained_marks", nullable = false)
    private Double obtainedMarks;
}
