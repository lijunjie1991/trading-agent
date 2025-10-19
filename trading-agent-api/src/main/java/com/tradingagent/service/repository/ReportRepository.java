package com.tradingagent.service.repository;

import com.tradingagent.service.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByTaskId(Long taskId);

    List<Report> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}
