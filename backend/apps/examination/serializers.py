from rest_framework import serializers
from .models import ExaminationType, Examination, MarkStructure

class ExaminationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExaminationType
        fields = '__all__'

class MarkStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarkStructure
        fields = '__all__'

class ExaminationSerializer(serializers.ModelSerializer):
    exam_type_details = ExaminationTypeSerializer(source='exam_type', read_only=True)
    mark_structures = MarkStructureSerializer(many=True, read_only=True)

    class Meta:
        model = Examination
        fields = '__all__'
