from rest_framework import viewsets
from .models import ExaminationType, Examination, MarkStructure
from .serializers import ExaminationTypeSerializer, ExaminationSerializer, MarkStructureSerializer

class ExaminationTypeViewSet(viewsets.ModelViewSet):
    queryset = ExaminationType.objects.all()
    serializer_class = ExaminationTypeSerializer

class ExaminationViewSet(viewsets.ModelViewSet):
    queryset = Examination.objects.all()
    serializer_class = ExaminationSerializer

class MarkStructureViewSet(viewsets.ModelViewSet):
    queryset = MarkStructure.objects.all()
    serializer_class = MarkStructureSerializer
