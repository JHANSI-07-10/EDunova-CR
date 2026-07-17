from django.db import models
from django.contrib.auth.models import User

# Phase 1: Planning Models
class ExaminationType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Examination(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Active', 'Active'),
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Archived', 'Archived'),
    ]
    name = models.CharField(max_length=200)
    exam_type = models.ForeignKey(ExaminationType, on_delete=models.CASCADE)
    academic_year = models.CharField(max_length=20)
    term = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')

    def __str__(self):
        return self.name

class MarkStructure(models.Model):
    examination = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='mark_structures')
    subject_id = models.CharField(max_length=50) # Assuming subject ID from portal tables
    max_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    passing_marks = models.DecimalField(max_digits=5, decimal_places=2, default=35)
    internal_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    external_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    practical_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.examination.name} - Subject {self.subject_id}"
