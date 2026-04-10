package com.devdroid.spars_server.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkMarkCreateRequest {

    @NotEmpty(message = "marks list cannot be empty")
    @Valid
    private List<MarkCreateRequest> marks;
}
