# Implementation Plan: Add raw_error_message Field

## Stage 1: Create Liquibase Migration
**Goal**: Add raw_error_message column to tasks table via new Liquibase changelog
**Success Criteria**:
- New changelog file v1.4.0-add-raw-error-message.xml created
- Column definition matches error_message (TEXT type)
- Changelog registered in master file
**Tests**:
- Java application starts successfully
- Database migration applies without errors
**Status**: Complete

## Stage 2: Update Java Entity
**Goal**: Add rawErrorMessage field to Task entity
**Success Criteria**:
- New field added with proper JPA annotations
- Getter and setter methods added
- Field matches database column definition
**Tests**:
- Java compiles successfully
- Entity properly maps to database
**Status**: Complete

## Stage 3: Update Python Database Models
**Goal**: Add raw_error_message field to Python ORM model and update functions
**Success Criteria**:
- Task model in database.py includes raw_error_message field
- update_task_status() accepts raw_error_message parameter
- update_task_status_raw_sql() includes raw_error_message in SQL
**Tests**:
- Python service starts without errors
- Database operations work correctly
**Status**: Complete

## Stage 4: Update Python Error Handling
**Goal**: Modify error handling to save both error messages
**Success Criteria**:
- Original error saved to raw_error_message
- User-friendly message saved to error_message
- All error catch blocks updated
**Tests**:
- Failed analysis saves both fields correctly
- User sees friendly message, admin can see raw error
**Status**: Complete

## Stage 5: Verification
**Goal**: Test end-to-end error handling flow
**Success Criteria**:
- Trigger analysis failure
- Verify raw_error_message contains original error
- Verify error_message contains user-friendly message
**Tests**:
- Manual test of failed analysis
- Check database records
**Status**: Ready for Testing
