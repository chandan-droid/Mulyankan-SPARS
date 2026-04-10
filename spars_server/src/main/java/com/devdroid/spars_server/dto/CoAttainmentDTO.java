package com.devdroid.spars_server.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoAttainmentDTO {
    private Integer coNumber;
    private Double attainmentLevel;
}
