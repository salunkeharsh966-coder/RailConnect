
package com.example.demo.controller;

import com.example.demo.service.DemoTrainImportService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/demo-data")
@CrossOrigin(origins = "*")
public class DemoTrainImportController {

    private final DemoTrainImportService demoTrainImportService;

    public DemoTrainImportController(
            DemoTrainImportService demoTrainImportService) {
        this.demoTrainImportService = demoTrainImportService;
    }

    @PostMapping("/import-trains")
    public ResponseEntity<Map<String, Object>> importDemoTrains() {

        Map<String, Object> result =
                demoTrainImportService.importDemoTrains();

        return ResponseEntity.ok(result);
    }
}
