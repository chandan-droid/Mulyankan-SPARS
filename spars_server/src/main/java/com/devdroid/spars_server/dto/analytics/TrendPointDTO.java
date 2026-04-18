package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrendPointDTO {
    private String label;
    private Double value;
}
