package com.tradingagent.service.repository;

import com.tradingagent.service.entity.UserQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface UserQuotaRepository extends JpaRepository<UserQuota, Long> {

    Optional<UserQuota> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT uq FROM UserQuota uq WHERE uq.user.id = :userId")
    Optional<UserQuota> findByUserIdForUpdate(@Param("userId") Long userId);
}
