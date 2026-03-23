import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateFormDto, CreateFormFieldDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async createForm(dto: CreateFormDto, userId: string, organizationId: string) {
    if (!dto.isOrgWide && !dto.departmentId) {
      throw new BadRequestException('Department ID is required for department-specific forms');
    }

    const form = await this.prisma.form.create({
      data: {
        name: dto.name,
        description: dto.description,
        isOrgWide: dto.isOrgWide,
        departmentId: dto.isOrgWide ? null : dto.departmentId,
        organizationId,
        createdById: userId,
        fields: dto.fields ? {
          create: dto.fields.map((field, index) => ({
            label: field.label,
            type: field.type,
            placeholder: field.placeholder,
            helpText: field.helpText,
            required: field.required,
            options: field.options,
            validation: field.validation,
            order: field.order ?? index,
          })),
        } : undefined,
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
    });

    return form;
  }

  async listForms(organizationId: string, filters?: { status?: string; departmentId?: string }) {
    return this.prisma.form.findMany({
      where: {
        organizationId,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.departmentId && { departmentId: filters.departmentId }),
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForm(id: string) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { order: 'asc' } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    return form;
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    return this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isOrgWide !== undefined && { isOrgWide: dto.isOrgWide }),
        ...(dto.departmentId !== undefined && { departmentId: dto.isOrgWide ? null : dto.departmentId }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
    });
  }

  async deleteForm(id: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    await this.prisma.form.delete({ where: { id } });
    return { deleted: true };
  }

  async addField(formId: string, dto: CreateFormFieldDto) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const maxOrder = await this.prisma.formField.aggregate({
      where: { formId },
      _max: { order: true },
    });

    return this.prisma.formField.create({
      data: {
        formId,
        label: dto.label,
        type: dto.type,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        required: dto.required,
        options: dto.options,
        validation: dto.validation,
        order: dto.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  async updateField(fieldId: string, dto: Partial<CreateFormFieldDto>) {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Field not found');
    }

    return this.prisma.formField.update({
      where: { id: fieldId },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.type && { type: dto.type }),
        ...(dto.placeholder !== undefined && { placeholder: dto.placeholder }),
        ...(dto.helpText !== undefined && { helpText: dto.helpText }),
        ...(dto.required !== undefined && { required: dto.required }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.validation !== undefined && { validation: dto.validation }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async deleteField(fieldId: string) {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Field not found');
    }

    await this.prisma.formField.delete({ where: { id: fieldId } });
    return { deleted: true };
  }

  async reorderFields(formId: string, fieldIds: string[]) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    await Promise.all(
      fieldIds.map((id, index) =>
        this.prisma.formField.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return this.getForm(formId);
  }

  async getFormsForEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        departmentAccess: { select: { departmentId: true } },
        formSubmissions: { select: { formId: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const accessibleDeptIds = [
      employee.departmentId,
      ...employee.departmentAccess.map(a => a.departmentId),
    ];

    const submittedFormIds = employee.formSubmissions.map(s => s.formId);

    const forms = await this.prisma.form.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { isOrgWide: true },
          { departmentId: { in: accessibleDeptIds } },
        ],
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return forms.map(form => ({
      ...form,
      isSubmitted: submittedFormIds.includes(form.id),
    }));
  }

  async submitForm(formId: string, employeeId: string, dto: SubmitFormDto) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: { fields: true },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.status !== 'ACTIVE') {
      throw new BadRequestException('Form is not active');
    }

    const requiredFields = form.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!dto.data[field.id] && dto.data[field.id] !== 0 && dto.data[field.id] !== false) {
        throw new BadRequestException(`Field "${field.label}" is required`);
      }
    }

    const existing = await this.prisma.formSubmission.findUnique({
      where: { formId_employeeId: { formId, employeeId } },
    });

    if (existing) {
      return this.prisma.formSubmission.update({
        where: { id: existing.id },
        data: { data: dto.data },
        include: {
          form: { select: { id: true, name: true } },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      });
    }

    return this.prisma.formSubmission.create({
      data: {
        formId,
        employeeId,
        data: dto.data,
      },
      include: {
        form: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  async getSubmissions(formId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const submissions = await this.prisma.formSubmission.findMany({
      where: { formId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: { select: { id: true, name: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return { form, submissions };
  }

  async getMySubmission(formId: string, employeeId: string) {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { formId_employeeId: { formId, employeeId } },
      include: {
        form: {
          include: { fields: { orderBy: { order: 'asc' } } },
        },
      },
    });

    return submission;
  }

  async exportSubmissions(formId: string, format: 'csv' | 'json' = 'csv') {
    const { form, submissions } = await this.getSubmissions(formId);

    if (format === 'json') {
      return {
        form: { id: form.id, name: form.name },
        fields: form.fields.map(f => ({ id: f.id, label: f.label, type: f.type })),
        submissions: submissions.map(s => ({
          employeeId: s.employee.id,
          employeeName: s.employee.user
            ? `${s.employee.user.firstName} ${s.employee.user.lastName}`
            : `${s.employee.firstName} ${s.employee.lastName}`,
          employeeEmail: s.employee.user?.email || s.employee.email,
          department: s.employee.department.name,
          submittedAt: s.submittedAt,
          data: s.data,
        })),
      };
    }

    const headers = [
      'Employee Name',
      'Email',
      'Department',
      'Submitted At',
      ...form.fields.map(f => f.label),
    ];

    const rows = submissions.map(s => {
      const employeeName = s.employee.user
        ? `${s.employee.user.firstName} ${s.employee.user.lastName}`
        : `${s.employee.firstName} ${s.employee.lastName}`;
      const email = s.employee.user?.email || s.employee.email || '';
      const data = s.data as Record<string, any>;

      return [
        employeeName,
        email,
        s.employee.department.name,
        s.submittedAt.toISOString(),
        ...form.fields.map(f => {
          const value = data[f.id];
          if (Array.isArray(value)) return value.join('; ');
          if (value === true) return 'Yes';
          if (value === false) return 'No';
          return value ?? '';
        }),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return {
      filename: `${form.name.replace(/[^a-zA-Z0-9]/g, '_')}_submissions.csv`,
      content: csvContent,
      mimeType: 'text/csv',
    };
  }
}
