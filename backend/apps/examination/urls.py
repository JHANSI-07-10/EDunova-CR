from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExaminationTypeViewSet, ExaminationViewSet, MarkStructureViewSet

router = DefaultRouter()
router.register(r'types', ExaminationTypeViewSet)
router.register(r'exams', ExaminationViewSet)
router.register(r'mark-structures', MarkStructureViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
