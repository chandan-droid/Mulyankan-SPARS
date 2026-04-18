package com.devdroid.spars_server.dto;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkMarkUpdateRequest {

    @Valid
    private List<MarkUpdateRequest> marks;
}
