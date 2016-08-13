# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

with open('README.md') as f:
    readme = f.read()

with open('LICENSE') as f:
    license = f.read()

setup(
    name='Tweet Analytics',
    version='0.0.1',
    description='Progressive Analytics of Twitter Datasets',
    long_description=readme,
    author='Karthik Badam',
    author_email='sriram.karthik6@gmail.com',
    url='https://github.com/karthikbadam/Progressive-Tweets',
    license=license,
    packages=find_packages(exclude=('tests', 'docs'))
)
