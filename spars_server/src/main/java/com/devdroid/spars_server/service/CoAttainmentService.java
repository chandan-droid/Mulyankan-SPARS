package com.devdroid.spars_server.service;

import com.devdroid.spars_server.dto.CoAttainmentDTO;
import com.devdroid.spars_server.dto.CoAttainmentReportDTO;
import com.devdroid.spars_server.entity.AssessmentType;
import com.devdroid.spars_server.entity.Mark;
import com.devdroid.spars_server.entity.QuestionMark;
import com.devdroid.spars_server.entity.Subject;
import com.devdroid.spars_server.exception.ResourceNotFoundException;
import com.devdroid.spars_server.repository.AcademicClassRepository;
import com.devdroid.spars_server.repository.MarkRepository;
import com.devdroid.spars_server.repository.QuestionMarkRepository;
import com.devdroid.spars_server.repository.StudentRepository;
import com.devdroid.spars_server.repository.SubjectRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoAttainmentService {

    private final QuestionMarkRepository questionMarkRepository;
    private final MarkRepository markRepository;
    private final StudentRepository studentRepository;
    private final AcademicClassRepository academicClassRepository;
    private final SubjectRepository subjectRepository;

    private static final double ATTAINMENT_THRESHOLD_PERCENTAGE = 0.60;
    private static final double DIRECT_WEIGHT                   = 0.80;
    private static final double INDIRECT_WEIGHT                 = 0.20;

    /**
     * Number of COs across which non-CO-mapped assessment marks are uniformly
     * distributed. Kept as a constant so it is easy to adjust institution-wide.
     */
    private static final int CO_COUNT = 5;

    // -------------------------------------------------------------------------
    // Public API — scope-based entry points (unchanged signatures)
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getStudentCoAttainment(Long studentId, Long subjectId) {
        studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));

        List<QuestionMark> coMapped    = questionMarkRepository.findByStudentAndSubject(studentId, subjectId);
        List<Mark>         nonCoMapped = markRepository.findNonCoMappedByStudentAndSubject(
                studentId, subjectId, AssessmentType.MIDSEM);

        return CoAttainmentReportDTO.builder()
                .subjectName(subject.getName())
                .scope("Student")
                .scopeId(studentId)
                .coAttainments(calculateCoAttainment(merge(coMapped, nonCoMapped)))
                .build();
    }

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getClassCoAttainment(Long classId, Long subjectId) {
        academicClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicClass not found with id: " + classId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));

        List<QuestionMark> coMapped    = questionMarkRepository.findByClassAndSubject(classId, subjectId);
        List<Mark>         nonCoMapped = markRepository.findNonCoMappedByClassAndSubject(
                classId, subjectId, AssessmentType.MIDSEM);

        return CoAttainmentReportDTO.builder()
                .subjectName(subject.getName())
                .scope("Class")
                .scopeId(classId)
                .coAttainments(calculateCoAttainment(merge(coMapped, nonCoMapped)))
                .build();
    }

    @Transactional(readOnly = true)
    public CoAttainmentReportDTO getInstituteCoAttainment(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + subjectId));

        List<QuestionMark> coMapped    = questionMarkRepository.findBySubject(subjectId);
        List<Mark>         nonCoMapped = markRepository.findNonCoMappedBySubject(
                subjectId, AssessmentType.MIDSEM);

        return CoAttainmentReportDTO.builder()
                .subjectName(subject.getName())
                .scope("Institute")
                .coAttainments(calculateCoAttainment(merge(coMapped, nonCoMapped)))
                .build();
    }

    // -------------------------------------------------------------------------
    // Uniform CO distribution helpers
    // -------------------------------------------------------------------------

    /**
     * Merges real CO-mapped {@link QuestionMark} records (from MidSem) with
     * synthetic records generated from non-CO-mapped assessments.  The returned
     * list is ephemeral — it is never persisted.
     */
    private List<QuestionMark> merge(List<QuestionMark> coMapped, List<Mark> nonCoMapped) {
        List<QuestionMark> all = new ArrayList<>(coMapped);
        all.addAll(generateUniformCoDistribution(nonCoMapped));
        return all;
    }

    /**
     * Generates transient (never-persisted) {@link QuestionMark} records for
     * assessments that carry no explicit CO mapping (Quiz, Assignment,
     * Attendance).  Each student's marks for such an assessment are divided
     * equally across {@value #CO_COUNT} COs so that every CO receives the same
     * share of both obtained and maximum marks — an unbiased, uniform approach.
     *
     * <p>Invariants guaranteed:
     * <ul>
     *   <li>No data is written to the database.</li>
     *   <li>Each generated record carries a reference to the real {@link Mark}
     *       so that the student identity (used for threshold evaluation) is
     *       always resolvable by the downstream {@code calculateCoAttainment}
     *       method.</li>
     *   <li>Assessments with a zero or null max-marks value are skipped to
     *       prevent division-by-zero errors.</li>
     * </ul>
     *
     * @param nonCoMapped marks from assessments without CO-level question mapping
     * @return list of transient QuestionMark objects ready for attainment calculation
     */
    private List<QuestionMark> generateUniformCoDistribution(List<Mark> nonCoMapped) {
        if (nonCoMapped == null || nonCoMapped.isEmpty()) {
            return List.of();
        }

        List<QuestionMark> synthetic = new ArrayList<>();

        for (Mark mark : nonCoMapped) {
            Integer rawMax   = mark.getAssessment().getMaxMarks();
            double  maxMarks = (rawMax != null) ? rawMax.doubleValue() : 0.0;

            if (maxMarks <= 0.0) {
                // Defensive: skip assessments with no declared max to avoid
                // polluting CO totals with a zero-denominator entry.
                continue;
            }

            double obtained    = (mark.getTotalMarks() != null) ? mark.getTotalMarks() : 0.0;
            double perCoMax    = maxMarks / CO_COUNT;
            double perCoObtained = obtained / CO_COUNT;

            for (int co = 1; co <= CO_COUNT; co++) {
                synthetic.add(QuestionMark.builder()
                        .mark(mark)           // real Mark → student stays resolvable
                        .questionNumber(co)   // synthetic question number equals CO number
                        .coNumber(co)
                        .maxMarks(perCoMax)
                        .obtainedMarks(perCoObtained)
                        .build());
            }
        }

        return synthetic;
    }

    // -------------------------------------------------------------------------
    // Core attainment calculation — unchanged from original implementation
    // -------------------------------------------------------------------------

    private List<CoAttainmentDTO> calculateCoAttainment(List<QuestionMark> questionMarks) {
        if (questionMarks == null || questionMarks.isEmpty()) {
            return List.of();
        }

        // Group by student so threshold attainment is evaluated per CO per student.
        Map<Long, List<QuestionMark>> marksByStudent = questionMarks.stream()
                .collect(Collectors.groupingBy(qm -> qm.getMark().getStudent().getId()));

        Map<Integer, Integer> studentsMeetingThresholdByCo = new LinkedHashMap<>();

        for (List<QuestionMark> studentMarks : marksByStudent.values()) {
            Map<Integer, List<QuestionMark>> marksByCoForStudent = studentMarks.stream()
                    .collect(Collectors.groupingBy(QuestionMark::getCoNumber));

            for (Map.Entry<Integer, List<QuestionMark>> coEntry : marksByCoForStudent.entrySet()) {
                Integer coNumber = coEntry.getKey();
                List<QuestionMark> coMarks = coEntry.getValue();

                double obtained = coMarks.stream().mapToDouble(QuestionMark::getObtainedMarks).sum();
                double max      = coMarks.stream().mapToDouble(QuestionMark::getMaxMarks).sum();
                double studentCoAttainment = max > 0.0 ? obtained / max : 0.0;

                if (studentCoAttainment >= ATTAINMENT_THRESHOLD_PERCENTAGE) {
                    studentsMeetingThresholdByCo.merge(coNumber, 1, Integer::sum);
                } else {
                    studentsMeetingThresholdByCo.putIfAbsent(coNumber, 0);
                }
            }
        }

        int totalStudents = marksByStudent.size();
        if (totalStudents == 0) {
            return List.of();
        }

        List<CoAttainmentDTO> coAttainments = new ArrayList<>();
        for (Map.Entry<Integer, Integer> entry : studentsMeetingThresholdByCo.entrySet()) {
            Integer coNumber             = entry.getKey();
            int     studentsMeetingThreshold = entry.getValue();

            double directAttainmentPercent   = (studentsMeetingThreshold * 100.0) / totalStudents;
            double indirectAttainmentPercent  = resolveIndirectAttainmentPercent(coNumber, questionMarks);
            double finalCoAttainmentPercent   = (directAttainmentPercent  * DIRECT_WEIGHT)
                                             + (indirectAttainmentPercent * INDIRECT_WEIGHT);

            coAttainments.add(new CoAttainmentDTO(coNumber, finalCoAttainmentPercent));
        }

        return coAttainments.stream()
                .sorted(Comparator.comparing(CoAttainmentDTO::getCoNumber))
                .collect(Collectors.toList());
    }

    // Placeholder hook for indirect attainment source. Falls back to direct-equivalent
    // behaviour until feedback-based indirect data is integrated in the domain model.
    private double resolveIndirectAttainmentPercent(Integer coNumber, List<QuestionMark> questionMarks) {
        return calculateDirectAttainmentPercentForCo(coNumber, questionMarks);
    }

    private double calculateDirectAttainmentPercentForCo(Integer coNumber, List<QuestionMark> questionMarks) {
        Map<Long, List<QuestionMark>> marksByStudent = questionMarks.stream()
                .collect(Collectors.groupingBy(qm -> qm.getMark().getStudent().getId()));

        int studentsMeetingThreshold = 0;
        for (List<QuestionMark> studentMarks : marksByStudent.values()) {
            List<QuestionMark> coMarks = studentMarks.stream()
                    .filter(mark -> coNumber.equals(mark.getCoNumber()))
                    .toList();

            if (coMarks.isEmpty()) {
                continue;
            }

            double obtained = coMarks.stream().mapToDouble(QuestionMark::getObtainedMarks).sum();
            double max      = coMarks.stream().mapToDouble(QuestionMark::getMaxMarks).sum();
            double studentCoAttainment = max > 0.0 ? obtained / max : 0.0;

            if (studentCoAttainment >= ATTAINMENT_THRESHOLD_PERCENTAGE) {
                studentsMeetingThreshold++;
            }
        }

        return marksByStudent.isEmpty() ? 0.0 : (studentsMeetingThreshold * 100.0) / marksByStudent.size();
    }
}
