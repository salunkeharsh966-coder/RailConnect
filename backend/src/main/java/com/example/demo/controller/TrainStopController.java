
package com.example.demo.controller;

import com.example.demo.entity.TrainStop;
import com.example.demo.service.TrainStopService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/train-stops")
@CrossOrigin(origins = "*")
public class TrainStopController {

    private final TrainStopService trainStopService;

    public TrainStopController(TrainStopService trainStopService) {
        this.trainStopService = trainStopService;
    }

    
    @PostMapping
    public TrainStop addTrainStop(
            @RequestParam Long trainId,
            @RequestParam Long stationId,
            @RequestBody TrainStop trainStop) {

        return trainStopService.addTrainStop(
                trainId, stationId, trainStop);
    }

    
    @GetMapping("/train/{trainId}")
    public List<TrainStop> getRouteByTrainId(
            @PathVariable Long trainId) {

        return trainStopService.getRouteByTrainId(trainId);
    }

    
    @GetMapping("/{id}")
    public TrainStop getTrainStopById(
            @PathVariable Long id) {

        return trainStopService.getTrainStopById(id);
    }

   
    @PutMapping("/{id}")
    public TrainStop updateTrainStop(
            @PathVariable Long id,
            @RequestBody TrainStop trainStop) {

        return trainStopService.updateTrainStop(id, trainStop);
    }

    @DeleteMapping("/{id}")
    public String deleteTrainStop(@PathVariable Long id) {

        trainStopService.deleteTrainStop(id);
        return "Train stop deleted successfully";
    }
}