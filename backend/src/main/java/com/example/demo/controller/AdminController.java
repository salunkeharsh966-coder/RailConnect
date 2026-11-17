package com.example.demo.controller;

import com.example.demo.entity.Booking;
import com.example.demo.entity.Train;
import com.example.demo.entity.User;
import com.example.demo.service.BookingService;
import com.example.demo.service.TrainService;
import com.example.demo.service.UserService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final TrainService trainService;
    private final UserService userService;
    private final BookingService bookingService;

    public AdminController(
            TrainService trainService,
            UserService userService,
            BookingService bookingService) {
        this.trainService = trainService;
        this.userService = userService;
        this.bookingService = bookingService;
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/users/{id}")
    public User getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with ID: " + id));
    }

    @DeleteMapping("/users/{id}")
    public String deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return "User deleted successfully";
    }

    @GetMapping("/trains")
    public List<Train> getAllTrains() {
        return trainService.getAllTrains();
    }

    @PostMapping("/trains")
    public Train addTrain(@RequestBody Train train) {
        return trainService.addTrain(train);
    }

    @PutMapping("/trains/{id}")
    public Train updateTrain(
            @PathVariable Long id,
            @RequestBody Train train) {
        return trainService.updateTrain(id, train);
    }

    @DeleteMapping("/trains/{id}")
    public String deleteTrain(@PathVariable Long id) {
        trainService.deleteTrain(id);
        return "Train deleted successfully";
    }

    @GetMapping("/bookings")
    public List<Booking> getAllBookings() {
        return bookingService.getAllBookings();
    }

    @GetMapping("/bookings/{id}")
    public Booking getBookingById(@PathVariable Long id) {
        return bookingService.getBookingById(id);
    }

    @PutMapping("/bookings/{id}/cancel")
    public Booking cancelBooking(@PathVariable Long id) {
        return bookingService.cancelBooking(id);
    }
}