#!/usr/bin/env python
# coding: utf-8

import pandas as pd
import graphviz
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
import json
from pathlib import Path

class FamilyTreeGenerator:
    """
    A comprehensive family tree generator using Graphviz to create descendant trees.
    
    This class processes genealogical data from a pandas DataFrame and generates
    visual family trees with customizable styling, proper spouse relationships,
    and generation-based layouts following genealogy best practices.
    
    Attributes:
        df (pd.DataFrame): The input genealogical data
        male_color (str): Hex color code for male person boxes
        female_color (str): Hex color code for female person boxes
        spouse_edge_color (str): Color for spouse relationship lines
        root_person_id (int): ID of the root person for the tree
        
    Example:
        >>> df = pd.read_excel('family_data.xlsx')
        >>> tree_gen = FamilyTreeGenerator(df, root_person_id=1)
        >>> tree_gen.generate_tree(output_file='family_tree', format='svg')
        >>> tree_gen.export_to_json('family_data.json')
    """
    
    def __init__(
        self,
        dataframe: pd.DataFrame,
        root_person_id: int = 1,
        male_color: str = "#CFE8FF",
        female_color: str = "#FFD6E7",
        spouse_edge_color: str = "#FFB6C6"
    ):
        """
        Initialize the FamilyTreeGenerator.
        
        Args:
            dataframe (pd.DataFrame): DataFrame containing genealogical data with columns:
                PersonID, Name, Nickname, Gender, BirthDate, DeathDate, FatherID, 
                MotherID, SpouseID
            root_person_id (int): PersonID of the root ancestor (default: 1)
            male_color (str): Hex color for male boxes (default: "#CFE8FF")
            female_color (str): Hex color for female boxes (default: "#FFD6E7")
            spouse_edge_color (str): Color for spouse connection lines (default: "#FFB6C6")
        """
        self.df = dataframe.copy()
        self.root_person_id = root_person_id
        self.male_color = male_color
        self.female_color = female_color
        self.spouse_edge_color = spouse_edge_color
        
        # Process and clean data
        self._process_dataframe()
        
        # Calculate generations
        self.generations = self._calculate_generations()
        
        # Build family relationships
        self.children_map = self._build_children_map()
        self.spouse_pairs = self._build_spouse_pairs()
        
    def _process_dataframe(self):
        """
        Process and clean the input dataframe.
        
        Converts date columns to datetime objects and handles missing values.
        """
        # Convert date columns
        date_columns = ['BirthDate', 'DeathDate']
        for col in date_columns:
            if col in self.df.columns:
                self.df[col] = pd.to_datetime(self.df[col], errors='coerce')
        
        # Ensure numeric columns
        id_columns = ['PersonID', 'FatherID', 'MotherID', 'SpouseID']
        for col in id_columns:
            if col in self.df.columns:
                self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
        
        # Fill NaN with None for easier handling
        self.df = self.df.where(pd.notna(self.df), None)
        
    def _calculate_generations(self) -> Dict[int, int]:
        """
        Calculate the generation level for each person.
        
        Generation 0 is the root person(s), Generation 1 are their children, etc.
        Spouses are assigned to the same generation as their partner.
        
        Returns:
            Dict[int, int]: Mapping of PersonID to generation number
        """
        generations = {}
        
        def assign_generation(person_id: int, gen: int):
            """Recursively assign generation numbers."""
            if person_id in generations:
                return
            generations[person_id] = gen
            
            # Assign spouse to same generation
            person_rows = self.df[self.df['PersonID'] == person_id]
            if not person_rows.empty:
                person_data = person_rows.iloc[0]
                spouse_id = int(person_data['SpouseID']) if person_data['SpouseID'] and not pd.isna(person_data['SpouseID']) else None
                if spouse_id and spouse_id not in generations:
                    generations[spouse_id] = gen
            
            # Find children
            children = self.df[
                (self.df['FatherID'] == person_id) | 
                (self.df['MotherID'] == person_id)
            ]
            
            for _, child in children.iterrows():
                assign_generation(int(child['PersonID']), gen + 1)
        
        # Start from root person
        assign_generation(self.root_person_id, 0)
        
        # Handle spouse of root if exists
        root_rows = self.df[self.df['PersonID'] == self.root_person_id]
        if not root_rows.empty:
            root_data = root_rows.iloc[0]
            if root_data['SpouseID'] and not pd.isna(root_data['SpouseID']):
                spouse_id = int(root_data['SpouseID'])
                if spouse_id not in generations:
                    generations[spouse_id] = 0
        
        return generations
    
    def _build_children_map(self) -> Dict[Tuple[Optional[int], Optional[int]], List[int]]:
        """
        Build a mapping of parent pairs to their children.
        
        Returns:
            Dict: Mapping of (father_id, mother_id) tuples to list of child PersonIDs
        """
        children_map = {}
        
        for _, row in self.df.iterrows():
            father_id = int(row['FatherID']) if row['FatherID'] and not pd.isna(row['FatherID']) else None
            mother_id = int(row['MotherID']) if row['MotherID'] and not pd.isna(row['MotherID']) else None
            
            if father_id or mother_id:
                key = (father_id, mother_id)
                if key not in children_map:
                    children_map[key] = []
                children_map[key].append(int(row['PersonID']))
        
        return children_map
    
    def _build_spouse_pairs(self) -> Set[Tuple[int, int]]:
        """
        Build a set of spouse pairs (husband, wife).
        
        Returns:
            Set[Tuple[int, int]]: Set of (male_id, female_id) tuples
        """
        spouse_pairs = set()
        
        for _, row in self.df.iterrows():
            person_id = int(row['PersonID'])
            spouse_id = int(row['SpouseID']) if row['SpouseID'] and not pd.isna(row['SpouseID']) else None
            
            if spouse_id:
                person_data = row
                spouse_rows = self.df[self.df['PersonID'] == spouse_id]
                
                if spouse_rows.empty:
                    continue
                    
                spouse_data = spouse_rows.iloc[0]
                
                # Ensure male is first in tuple
                if person_data['Gender'] == 'male':
                    spouse_pairs.add((person_id, spouse_id))
                else:
                    spouse_pairs.add((spouse_id, person_id))
        
        return spouse_pairs
    
    def _format_person_label(self, person_data: pd.Series) -> str:
        """
        Format the label for a person's node.
        
        Args:
            person_data (pd.Series): Row data for the person
            
        Returns:
            str: Formatted label string for the node
        """
        name = person_data['Name']
        nickname = person_data['Nickname']
        
        label = name
        if nickname and not pd.isna(nickname):
            label += f" '{nickname}'"
        
        return label
    
    def _get_node_color(self, gender: str) -> str:
        """
        Get the fill color for a person's node based on gender.
        
        Args:
            gender (str): Gender of the person ('male' or 'female')
            
        Returns:
            str: Hex color code
        """
        return self.male_color if gender == 'male' else self.female_color
    
    def _calculate_lifetime(self, birth_date, death_date) -> Optional[str]:
        """
        Calculate lifetime duration for deceased persons.
        
        Args:
            birth_date: Birth date (datetime or None)
            death_date: Death date (datetime or None)
            
        Returns:
            Optional[str]: Formatted lifetime string or None
        """
        if birth_date and death_date:
            delta = death_date - birth_date
            years = delta.days // 365
            remaining = delta.days % 365
            months = remaining // 30
            days = remaining % 30
            
            return f"{years} years, {months} months, {days} days"
        return None
    
    def _format_date(self, date_obj) -> Optional[str]:
        """
        Format a date object to string.
        
        Args:
            date_obj: datetime object or None
            
        Returns:
            Optional[str]: Formatted date string or None
        """
        if date_obj and not pd.isna(date_obj):
            return date_obj.strftime('%b %d, %Y')
        return None
    
    def _get_person_full_name(self, person_id: Optional[int]) -> Optional[str]:
        """
        Get full name with nickname for a person.
        
        Args:
            person_id (Optional[int]): PersonID or None
            
        Returns:
            Optional[str]: Formatted name string or None
        """
        if not person_id or pd.isna(person_id):
            return None
        
        person = self.df[self.df['PersonID'] == person_id]
        if person.empty:
            return None
        
        person_data = person.iloc[0]
        name = person_data['Name']
        nickname = person_data['Nickname']
        
        if nickname and not pd.isna(nickname):
            return f"{name} '{nickname}'"
        return name
    
    def _add_legend(self, dot: graphviz.Digraph):
        """
        Add a legend to the graph.
        
        Args:
            dot (graphviz.Digraph): The graph object to add legend to
        """
        with dot.subgraph(name='cluster_legend') as legend:
            legend.attr(label='Legend', fontsize='10', style='dashed', rank='same')
            legend.node('legend_male', label='Male', fillcolor=self.male_color)
            legend.node('legend_female', label='Female', fillcolor=self.female_color)
            legend.node('legend_union', shape='point', width='0.01', label='')
            with legend.subgraph() as s:
                s.attr(rank='same')
                s.node('legend_male')
                s.node('legend_female')
                s.node('legend_union')
            legend.edge('legend_male', 'legend_union', color=self.spouse_edge_color)
            legend.edge('legend_union', 'legend_female',color=self.spouse_edge_color)
    
    def _build_tree_structure(self, dot: graphviz.Digraph, include_legend: bool = True):
        """
        Build the complete tree structure in the DOT graph following genealogy best practices.
        
        This method implements proper descendant tree structure with:
        - Union nodes for marriages
        - rank=same to keep spouses horizontally aligned
        - Male spouse to the left, female spouse to the right
        - Children connected to union nodes, not directly to parents
        
        Args:
            dot (graphviz.Digraph): The graph object to build structure in
            include_legend (bool): Whether to include a legend
        """
        # Add legend if requested
        if include_legend:
            self._add_legend(dot)
        
        # Track created nodes and union points
        created_nodes = set()
        union_counter = 0
        union_nodes = {}  # Map (parent1, parent2) to union node id
       
        # Process each generation
        for gen in sorted(set(self.generations.values())):
            gen_people = [
                pid for pid, g in self.generations.items() if g == gen
            ]
            
            # Sort by PersonID (generally follows birth order)
            gen_people.sort()
            
            # Separate into married couples and singles
            processed = set()
            ordered_people = []  # Will contain person_ids in display order
            
            # First, identify all spouse pairs in this generation
            gen_spouse_pairs = []
            for male_id, female_id in self.spouse_pairs:
                if male_id in gen_people and female_id in gen_people:
                    gen_spouse_pairs.append((male_id, female_id))
                    processed.add(male_id)
                    processed.add(female_id)
            
            # Add spouse pairs to ordered list (male first, then female)
            for male_id, female_id in gen_spouse_pairs:
                ordered_people.append(male_id)
                ordered_people.append(female_id)
            
            # Add singles (unmarried people in this generation)
            for person_id in gen_people:
                if person_id not in processed:
                    ordered_people.append(person_id)
                    processed.add(person_id)
            
            # Create person nodes for this generation
            gen_node_ids = []
            for person_id in ordered_people:
                node_id = f"p{person_id}"
                person_rows = self.df[self.df['PersonID'] == person_id]
                
                if person_rows.empty:
                    continue
                    
                person_data = person_rows.iloc[0]
                label = self._format_person_label(person_data)
                color = self._get_node_color(person_data['Gender'])
                
                dot.node(node_id, label=label, fillcolor=color)
                created_nodes.add(person_id)
                gen_node_ids.append(node_id)
           
            # Create union nodes and connect spouses
            union_ids = [] # For storing union_ids 
            for male_id, female_id in gen_spouse_pairs:
                union_id = f"u{union_counter}"
                union_counter += 1
                union_nodes[(male_id, female_id)] = union_id
                
                # Create invisible union point
                dot.node(union_id, shape='point', width='0.01', label='', height='0.01')
                union_ids.append(union_id)
                
                # Connect spouses to union point horizontally
                if df[df['PersonID']==male_id].FatherID.any() or df[df['PersonID']==male_id].MotherID.any(): 
                    dot.edge(f"p{male_id}", union_id, color=self.spouse_edge_color, constraints='true')
                    dot.edge(union_id, f"p{female_id}", color=self.spouse_edge_color, constraint='true')
                else:
                    dot.edge(f"p{female_id}", union_id, color=self.spouse_edge_color, constraints='true')
                    dot.edge(union_id, f"p{male_id}", color=self.spouse_edge_color, constraint='true')

            # Use rank=same to keep all people in this generation at same level
            if gen_node_ids:
                with dot.subgraph() as s:
                    s.attr(rank='same')
                    for node_id in gen_node_ids:
                        s.node(node_id)
                    for union_id in union_ids:
                        s.node(union_id)
                        
        # Now connect parents to children via union nodes
        # This is done after all nodes are created to ensure proper layout
        for (father_id, mother_id), children in self.children_map.items():
            if father_id and mother_id:
                # Married couple - use union node
                union_id = union_nodes.get((father_id, mother_id))
                if union_id:
                    for child_id in children:
                        if child_id in created_nodes:
                            dot.edge(union_id, f"p{child_id}", constraint='true')
                else:
                    # Union node doesn't exist (shouldn't happen but handle it)
                    for child_id in children:
                        if child_id in created_nodes:
                            if father_id in created_nodes:
                                dot.edge(f"p{father_id}", f"p{child_id}", constraint='true')
            elif father_id:
                # Single father
                for child_id in children:
                    if child_id in created_nodes and father_id in created_nodes:
                        dot.edge(f"p{father_id}", f"p{child_id}", constraint='true')
            elif mother_id:
                # Single mother
                for child_id in children:
                    if child_id in created_nodes and mother_id in created_nodes:
                        dot.edge(f"p{mother_id}", f"p{child_id}", constraint='true')
    
    def generate_tree(
        self,
        output_file: str = 'family_tree',
        format: str = 'svg',
        include_legend: bool = False
    ) -> graphviz.Digraph:
        """
        Generate the family tree diagram.
        
        Args:
            output_file (str): Output filename (without extension)
            format (str): Output format - 'svg', 'png' (default: 'svg')
            include_legend (bool): Whether to include a legend (default: True)
            
        Returns:
            graphviz.Digraph: The generated graph object
        """
        dot = graphviz.Digraph('DescendantTree', format=format)
        
        # Global graph settings - optimized for descendant trees
        dot.attr(
            rankdir='TB',           # Top to bottom
            splines='polyline',        # type of lines to connect
            nodesep='0.5',          # Horizontal spacing between nodes
            ranksep='1.2',          # Vertical spacing between generations
            fontname='Helvetica',
            bgcolor='white'
        )
        
        # Default node settings
        dot.attr(
            'node',
            shape='box',
            style='rounded,filled',
            fontname='Helvetica',
            fontsize='10',
            margin='0.08,0.05',
            fillcolor='#F9F9F9'
        )
        
        # Default edge settings
        dot.attr('edge', arrowhead='none', color='#555555')
        
        # Build the tree structure
        self._build_tree_structure(dot, include_legend=include_legend)
        
        # Render the graph
        dot.render(output_file, cleanup=True)
        
        print(f"Family tree generated: {output_file}.{format}")
        print(f"Total persons in tree: {len([p for p in self.generations.keys()])}")
        print(f"Number of generations: {len(set(self.generations.values()))}")
        
        return dot
    
    def generate_html(
        self,
        output_file: str = 'family_tree.html',
        include_legend: bool = False,
        title: str = "Family Tree"
    ):
        """
        Generate an interactive HTML file with embedded SVG.
        
        The HTML includes zoom/pan capabilities and styling for better viewing.
        
        Args:
            output_file (str): Output HTML filename
            include_legend (bool): Whether to include a legend (default: True)
            title (str): Title for the HTML page
        """
        # Generate SVG
        dot = graphviz.Digraph('DescendantTree', format='svg')
        
        # Apply settings
        dot.attr(
            rankdir='TB',
            splines='polyline',
            nodesep='0.5',
            ranksep='1.2',
            fontname='Helvetica',
            bgcolor='white'
        )
        
        dot.attr(
            'node',
            shape='box',
            style='rounded,filled',
            fontname='Helvetica',
            fontsize='10',
            margin='0.08,0.05',
            fillcolor='#F9F9F9'
        )
        
        dot.attr('edge', arrowhead='none', color='#555555')
        
        # Build tree
        self._build_tree_structure(dot, include_legend=include_legend)
        
        # Get SVG content
        svg_content = dot.pipe(format='svg').decode('utf-8')
        
        # Create HTML with embedded SVG
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Helvetica', Arial, sans-serif;
            background-color: #f5f5f5;
            overflow: hidden;
        }}
        
        .header {{
            background-color: #2c3e50;
            color: white;
            padding: 15px 20px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            font-size: 24px;
            font-weight: 500;
        }}
        
        .controls {{
            background-color: #34495e;
            padding: 10px 20px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        }}
        
        .controls button {{
            background-color: #3498db;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }}
        
        .controls button:hover {{
            background-color: #2980b9;
        }}
        
        .controls button.active {{
            background-color: #27ae60;
        }}
        
        .controls button.active:hover {{
            background-color: #229954;
        }}
        
        .svg-container {{
            width: 100%;
            height: calc(100vh - 100px);
            overflow: auto;
            background-color: white;
            position: relative;
        }}
        
        .svg-wrapper {{
            padding: 20px;
            display: inline-block;
            min-width: 100%;
            min-height: 100%;
        }}
        
        .svg-container.pan-mode {{
            cursor: grab;
        }}
        
        .svg-container.pan-mode.panning {{
            cursor: grabbing;
        }}
        
        svg {{
            display: block;
            margin: 0 auto;
            max-width: none;
            height: auto;
        }}
        
        .info {{
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: rgba(52, 73, 94, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{title}</h1>
    </div>
    
    <div class="controls">
        <button onclick="zoomIn()">Zoom In (+)</button>
        <button onclick="zoomOut()">Zoom Out (-)</button>
        <button onclick="resetZoom()">Reset</button>
        <button id="panBtn" onclick="togglePan()">Enable Pan Mode</button>
        <button onclick="downloadSVG()">Download SVG</button>
    </div>
    
    <div class="svg-container" id="svgContainer">
        <div class="svg-wrapper">
            {svg_content}
        </div>
    </div>
    
    <div class="info">
        <strong>Persons:</strong> {len(self.generations)} | 
        <strong>Generations:</strong> {len(set(self.generations.values()))}
    </div>
    
    <script>
        let currentZoom = 1;
        let panEnabled = false;
        let isPanning = false;
        let startX, startY, scrollLeft, scrollTop;
        
        const svgContainer = document.getElementById('svgContainer');
        const svg = svgContainer.querySelector('svg');
        const panBtn = document.getElementById('panBtn');
        
        function zoomIn() {{
            currentZoom += 0.1;
            applyZoom();
        }}
        
        function zoomOut() {{
            if (currentZoom > 0.2) {{
                currentZoom -= 0.1;
                applyZoom();
            }}
        }}
        
        function resetZoom() {{
            currentZoom = 1;
            applyZoom();
            svgContainer.scrollTop = 0;
            svgContainer.scrollLeft = 0;
        }}
        
        function applyZoom() {{
            svg.style.transform = `scale(${{currentZoom}})`;
            svg.style.transformOrigin = 'top center';
        }}
        
        function togglePan() {{
            panEnabled = !panEnabled;
            
            if (panEnabled) {{
                svgContainer.classList.add('pan-mode');
                panBtn.classList.add('active');
                panBtn.textContent = 'Disable Pan Mode';
            }} else {{
                svgContainer.classList.remove('pan-mode');
                panBtn.classList.remove('active');
                panBtn.textContent = 'Enable Pan Mode';
            }}
        }}
        
        function downloadSVG() {{
            const svgData = svg.outerHTML;
            const blob = new Blob([svgData], {{type: 'image/svg+xml'}});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'family_tree.svg';
            link.click();
            URL.revokeObjectURL(url);
        }}
        
        // Pan functionality
        svgContainer.addEventListener('mousedown', (e) => {{
            if (!panEnabled) return;
            
            isPanning = true;
            svgContainer.classList.add('panning');
            startX = e.pageX - svgContainer.offsetLeft;
            startY = e.pageY - svgContainer.offsetTop;
            scrollLeft = svgContainer.scrollLeft;
            scrollTop = svgContainer.scrollTop;
        }});
        
        svgContainer.addEventListener('mouseleave', () => {{
            if (isPanning) {{
                isPanning = false;
                svgContainer.classList.remove('panning');
            }}
        }});
        
        svgContainer.addEventListener('mouseup', () => {{
            if (isPanning) {{
                isPanning = false;
                svgContainer.classList.remove('panning');
            }}
        }});
        
        svgContainer.addEventListener('mousemove', (e) => {{
            if (!isPanning) return;
            
            e.preventDefault();
            const x = e.pageX - svgContainer.offsetLeft;
            const y = e.pageY - svgContainer.offsetTop;
            const walkX = (x - startX) * 1.5; // Adjust sensitivity
            const walkY = (y - startY) * 1.5;
            
            svgContainer.scrollLeft = scrollLeft - walkX;
            svgContainer.scrollTop = scrollTop - walkY;
        }});
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {{
            if (e.key === '+' || e.key === '=') {{
                zoomIn();
            }} else if (e.key === '-') {{
                zoomOut();
            }} else if (e.key === '0') {{
                resetZoom();
            }} else if (e.key === 'p' || e.key === 'P') {{
                togglePan();
            }}
        }});
    </script>
</body>
</html>
"""
        
        # Write HTML file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"Interactive HTML generated: {output_file}")
        print(f"Open in browser to view with zoom/pan controls")
        print(f"Keyboard shortcuts: +/- (zoom), 0 (reset), P (toggle pan mode)")
    
    def get_dot_source(self) -> str:
        """
        Get the Graphviz DOT language source code.
        
        Returns:
            str: The DOT source code for the family tree
        """
        # Generate tree without rendering to get the DOT source
        dot = graphviz.Digraph('DescendantTree', format='svg')
        
        # Apply all the same settings as generate_tree
        dot.attr(
            rankdir='TB',
            splines='ortho',
            nodesep='0.5',
            ranksep='1.2',
            fontname='Helvetica',
            bgcolor='white'
        )
        
        dot.attr(
            'node',
            shape='box',
            style='rounded,filled',
            fontname='Helvetica',
            fontsize='10',
            margin='0.08,0.05',
            fillcolor='#F9F9F9'
        )
        
        dot.attr('edge', arrowhead='none', color='#555555')
        
        # Build the complete tree structure
        self._build_tree_structure(dot, include_legend=True)
        
        return dot.source
    
    def save_dot_source(self, output_file: str = 'family_tree.dot'):
        """
        Save the Graphviz DOT source code to a file.
        
        This allows manual editing and rendering with: dot -Tsvg file.dot -o output.svg
        
        Args:
            output_file (str): Path to output DOT file
        """
        dot_source = self.get_dot_source()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(dot_source)
        
        print(f"DOT source saved to: {output_file}")
        print(f"To render manually: dot -Tsvg {output_file} -o output.svg")
    
    def export_to_json(self, output_file: str = 'family_data.json'):
        """
        Export family data to JSON file with calculated fields.
        
        Includes generation order, lifetime calculations, formatted dates,
        and relationship information.
        
        Args:
            output_file (str): Path to output JSON file
        """
        export_data = []
        
        for _, row in self.df.iterrows():
            person_id = int(row['PersonID'])
            
            person_dict = {
                'PersonID': person_id,
                'Name': row['Name'],
                'Nickname': row['Nickname'] if row['Nickname'] else None,
                'Gender': row['Gender'],
                'Generation': self.generations.get(person_id, None),
                'BirthDate': self._format_date(row['BirthDate']),
                'DeathDate': self._format_date(row['DeathDate']),
            }
            
            # Add lifetime for deceased
            if not pd.isna(row['DeathDate']):
                person_dict['Lifetime'] = self._calculate_lifetime(
                    row['BirthDate'], 
                    row['DeathDate']
                )
                person_dict['LifeSpan'] = (
                    f"{person_dict['BirthDate']} to {person_dict['DeathDate']}"
                )
            
            # Add relationships
            father_id = int(row['FatherID']) if row['FatherID'] and not pd.isna(row['FatherID']) else None
            mother_id = int(row['MotherID']) if row['MotherID'] and not pd.isna(row['MotherID']) else None
            spouse_id = int(row['SpouseID']) if row['SpouseID'] and not pd.isna(row['SpouseID']) else None
            
            person_dict['Father'] = self._get_person_full_name(father_id)
            person_dict['Mother'] = self._get_person_full_name(mother_id)
            person_dict['Spouse'] = self._get_person_full_name(spouse_id)
            
            # Add children
            children_as_father = self.children_map.get((person_id, None), [])
            children_as_mother = self.children_map.get((None, person_id), [])
            
            if spouse_id:
                if row['Gender'] == 'male':
                    children_with_spouse = self.children_map.get((person_id, spouse_id), [])
                else:
                    children_with_spouse = self.children_map.get((spouse_id, person_id), [])
            else:
                children_with_spouse = []
            
            all_children = list(set(children_as_father + children_as_mother + children_with_spouse))
            person_dict['Children'] = [
                self._get_person_full_name(child_id) for child_id in all_children
            ]
            
            export_data.append(person_dict)
        
        # Write to JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"Family data exported to {output_file}")


if __name__ == "__main__":
    
    df = pd.read_excel("excel/Alto Family Tree.xlsx",sheet_name="Family Tree",usecols="A:L",header=4)
    
    # Create family tree generator
    tree_gen = FamilyTreeGenerator(
        df, 
        root_person_id=1,
        male_color="#CFE8FF",
        female_color="#FFD6E7"
    )
    
    # Generate tree in multiple formats
    tree_gen.generate_tree(output_file='output\\alto_family_tree', format='svg')
    tree_gen.generate_tree(output_file='output\\alto_family_tree', format='png')
    
    # Export DOT source
    print("\nGraphviz DOT Source:")
    print(tree_gen.get_dot_source())
    tree_gen.save_dot_source(output_file="output\\alto_family_dotfile.txt")
    
    # Generate interactive HTML
    tree_gen.generate_html(output_file='output\\alto_family_tree.html', title="Alto Family Descendant Tree (Descendants of Lolo Jose and Lola Pepay)")
    
    # Export to JSON
    tree_gen.export_to_json('output\\alto_family_data.json')


# In[ ]:




