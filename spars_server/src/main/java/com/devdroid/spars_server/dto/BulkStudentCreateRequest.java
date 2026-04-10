package com.devdroid.spars_server.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkStudentCreateRequest {

    @NotEmpty(message = "students list cannot be empty")
    @Valid
    private List<StudentDTO> students;
}
