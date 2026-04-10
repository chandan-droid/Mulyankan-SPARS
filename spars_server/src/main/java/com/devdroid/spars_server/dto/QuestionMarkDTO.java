package com.devdroid.spars_server.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionMarkDTO {

    private Long id;

    private Long markId;

    private Integer questionNumber;

    private Integer coNumber;

    private Double maxMarks;

    private Double obtainedMarks;
}
