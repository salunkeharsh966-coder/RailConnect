
package com.example.demo.controller;

import com.example.demo.entity.Coach;
import com.example.demo.service.CoachService;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/coaches")
@CrossOrigin(origins = "*")
public class CoachController {

    private final CoachService coachService;

    public CoachController(CoachService coachService) {
        this.coachService = coachService;
    }

    // ADD COACH
    @PostMapping
    public Coach addCoach(
            @RequestParam Long trainId,
            @RequestBody Coach coach) {

        return coachService.addCoach(trainId, coach);
    }

    // CREATE COMPLETE TRAIN FORMATION
    @PostMapping("/train/{trainId}/formation/{formationType}")
    public Map<String, Object> createFormation(
            @PathVariable Long trainId,
            @PathVariable String formationType) {

        return coachService.createFormation(
                trainId,
                formationType
        );
    }

    // GET ALL COACHES
    @GetMapping
    public List<Coach> getAllCoaches() {
        return coachService.getAllCoaches();
    }

    // GET COACHES BY TRAIN
    @GetMapping("/train/{trainId}")
    public List<Coach> getCoachesByTrainId(
            @PathVariable Long trainId) {

        return coachService.getCoachesByTrainId(trainId);
    }

    // GET SINGLE COACH
    @GetMapping("/{coachId}")
    public Coach getCoachById(
            @PathVariable Long coachId) {

        return coachService.getCoachById(coachId);
    }

    // UPDATE COACH
    @PutMapping("/{coachId}")
    public Coach updateCoach(
            @PathVariable Long coachId,
            @RequestBody Coach coach) {

        return coachService.updateCoach(coachId, coach);
    }

    // DELETE COACH
    @DeleteMapping("/{coachId}")
    public String deleteCoach(
            @PathVariable Long coachId) {

        coachService.deleteCoach(coachId);

        return "Coach deleted successfully";
    }
}
